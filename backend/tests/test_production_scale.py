import pytest
import time
import concurrent.futures
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)


def test_high_scale_read_throughput():
    """
    Simulates high-traffic burst traffic across critical read endpoints:
    /api/health, /api/forecast/latest, /api/market/summary, /api/v1/stocks.
    Ensures sub-second response times and 0% failure rate under concurrency.
    """
    endpoints = [
        "/api/health",
        "/api/forecast/latest",
        "/api/market/summary",
        "/api/v1/stocks",
        "/api/model/status",
        "/api/model/config",
    ]

    # Pre-warm caches
    for ep in endpoints:
        res = client.get(ep)
        assert res.status_code == 200

    def hit_endpoint(ep):
        t0 = time.perf_counter()
        res = client.get(ep)
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        return res.status_code, elapsed_ms

    requests_per_endpoint = 25
    total_calls = len(endpoints) * requests_per_endpoint

    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as executor:
        futures = [
            executor.submit(hit_endpoint, ep)
            for ep in endpoints
            for _ in range(requests_per_endpoint)
        ]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    assert len(results) == total_calls
    status_codes = [r[0] for r in results]
    latencies = [r[1] for r in results]

    # 100% success rate required for production scale
    assert all(code == 200 for code in status_codes)

    # p95 latency should be well under 100ms when cached in-memory
    latencies.sort()
    p95 = latencies[int(len(latencies) * 0.95)]
    assert p95 < 200.0, f"p95 latency {p95}ms exceeded 200ms threshold"


def test_database_connection_pool_under_stress():
    """
    Validates that Neon PostgreSQL connection pooling handles multiple simultaneous
    queries without connection exhaustion, pool timeouts, or deadlocks.
    """
    def query_history():
        res = client.get("/api/forecast/history?page=1&pageSize=10")
        return res.status_code

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(query_history) for _ in range(24)]
        codes = [f.result() for f in concurrent.futures.as_completed(futures)]

    assert all(c == 200 for c in codes)


def test_cors_headers_and_security():
    """
    Ensures CORS headers are properly returned for cross-origin frontend clients.
    """
    headers = {
        "Origin": "http://127.0.0.1:5173",
        "Access-Control-Request-Method": "GET"
    }
    res = client.get("/api/forecast/latest", headers=headers)
    assert res.status_code == 200
    assert "access-control-allow-origin" in res.headers


def test_malformed_and_extreme_inputs():
    """
    Fuzzes endpoints with invalid pagination, illegal symbols, and out-of-range bounds.
    Verifies that the server does not crash with 500 Unhandled Exception.
    """
    # Negative pagination
    res = client.get("/api/forecast/history?page=-1&pageSize=0")
    assert res.status_code in [200, 422]  # Handled cleanly

    # Excessively large page size
    res = client.get("/api/forecast/history?page=1&pageSize=1000000")
    assert res.status_code in [200, 422]

    # Non-existent stock symbol in v1 returns fallback metadata cleanly
    res = client.get("/api/v1/stocks/NON_EXISTENT_SYMBOL_XYZ")
    assert res.status_code == 200
    assert res.json()["ticker"] == "NON_EXISTENT_SYMBOL_XYZ"

    # Invalid range parameter
    res = client.get("/api/market/history?range=INVALID_RANGE_PARAM")
    assert res.status_code == 422 or res.status_code == 200


def test_lstm_model_inference_consistency():
    """
    Verifies that back-to-back inferences return mathematically deterministic results
    and that predicted returns correlate with implied prices according to the recovery formula:
    implied_close = reference_close * (1 + predicted_return)
    """
    res1 = client.get("/api/forecast/latest").json()
    res2 = client.get("/api/forecast/latest").json()

    assert res1["ticker"] == "^GSPC"
    assert res1["predictedReturn"] == res2["predictedReturn"]
    assert res1["predictedClose"] == res2["predictedClose"]

    ref = res1["referenceClose"]
    ret = res1["predictedReturn"]
    expected_close = round(ref * (1.0 + ret), 2)
    assert abs(res1["predictedClose"] - expected_close) <= 0.02

