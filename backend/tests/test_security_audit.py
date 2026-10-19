import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_sql_injection_resilience_in_prediction_history():
    """Verify that SQL injection payloads in query parameters do not execute or compromise the database."""
    sqli_payloads = [
        "' OR '1'='1",
        "'; DROP TABLE predictions; --",
        "1' UNION SELECT null, null, null, null, null, null, null, null, null, null, null, null, null, null --",
        "^GSPC' OR 1=1 --",
        "admin'--",
    ]
    for payload in sqli_payloads:
        res = client.get(f"/api/forecast/history?ticker={payload}")
        # The query should safely execute parameterized without syntax error or table drop
        assert res.status_code == 200
        data = res.json()
        assert "records" in data
        assert isinstance(data["records"], list)

    # Verify table was not dropped
    verify_res = client.get("/api/forecast/history")
    assert verify_res.status_code == 200


def test_sql_injection_resilience_in_signal_filter():
    res = client.get("/api/forecast/history?signal=BULLISH' OR '1'='1")
    assert res.status_code == 200
    assert "records" in res.json()


def test_xss_script_injection_sanitization():
    """Verify that XSS script payloads in tickers are returned safely without execution."""
    import urllib.parse
    xss_payload = "<script>alert('XSS')</script>"
    encoded = urllib.parse.quote(xss_payload)
    res = client.get(f"/api/v1/stocks/{encoded}")
    assert res.status_code in [200, 400, 404]
    content_type = res.headers.get("content-type", "")
    assert "application/json" in content_type


def test_path_traversal_prevention_in_ticker_routing():
    """Verify that directory traversal attempts are blocked or treated as string identifiers."""
    traversal_payloads = [
        "../../../../etc/passwd",
        "..%2F..%2F..%2F..%2Fwindows%2Fwin.ini",
        "....//....//config.json"
    ]
    for payload in traversal_payloads:
        res = client.get(f"/api/v1/forecast/{payload}")
        # Traversal attempts for non-^GSPC tickers must fail
        assert res.status_code in [400, 404, 422]


def test_large_payload_and_dos_boundaries():
    """Verify that oversized pagination requests are rejected by schema validators."""
    # pageSize > 100 is rejected by Query(le=100)
    res = client.get("/api/forecast/history?pageSize=1000000")
    assert res.status_code == 422

    # Negative page is rejected by Query(ge=1)
    res_neg = client.get("/api/forecast/history?page=-1")
    assert res_neg.status_code == 422
