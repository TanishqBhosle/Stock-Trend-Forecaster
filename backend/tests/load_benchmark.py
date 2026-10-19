import sys
sys.path.insert(0, 'backend')
import time
import statistics
import concurrent.futures
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def benchmark_endpoint(endpoint_name: str, url: str, num_requests: int = 200, concurrency: int = 10):
    latencies = []
    errors = 0

    def single_req():
        t0 = time.perf_counter()
        try:
            res = client.get(url)
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            if res.status_code == 200:
                return elapsed_ms, False
            else:
                return elapsed_ms, True
        except Exception:
            return (time.perf_counter() - t0) * 1000.0, True

    t_start = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(single_req) for _ in range(num_requests)]
        for f in concurrent.futures.as_completed(futures):
            elapsed_ms, is_err = f.result()
            latencies.append(elapsed_ms)
            if is_err:
                errors += 1

    total_time_s = time.perf_counter() - t_start
    rps = num_requests / total_time_s

    latencies.sort()
    p50 = statistics.median(latencies)
    p95 = latencies[int(len(latencies) * 0.95)]
    p99 = latencies[int(len(latencies) * 0.99)]
    avg = statistics.mean(latencies)

    print(f"\n=======================================================")
    print(f"BENCHMARK RESULTS: {endpoint_name} ({url})")
    print(f"Total Requests: {num_requests} | Concurrency: {concurrency}")
    print(f"Throughput:     {rps:.1f} req/sec")
    print(f"Error Rate:     {errors / num_requests * 100:.1f}% ({errors} errors)")
    print(f"Latency Mean:   {avg:.2f} ms")
    print(f"Latency p50:    {p50:.2f} ms")
    print(f"Latency p95:    {p95:.2f} ms")
    print(f"Latency p99:    {p99:.2f} ms")
    print(f"Total Duration: {total_time_s:.2f} s")
    print(f"=======================================================")

    return {
        "endpoint": endpoint_name,
        "url": url,
        "requests": num_requests,
        "concurrency": concurrency,
        "rps": rps,
        "error_rate": errors / num_requests,
        "p50_ms": p50,
        "p95_ms": p95,
        "p99_ms": p99,
        "avg_ms": avg
    }


def run_full_load_benchmark():
    # Warm up caches
    client.get("/api/forecast/latest")
    client.get("/api/market/history?range=1Y")
    client.get("/api/forecast/history?page=1&pageSize=20")

    b_health = benchmark_endpoint("Liveness Health", "/api/health", num_requests=300, concurrency=12)
    b_forecast = benchmark_endpoint("Latest Forecast (Cached)", "/api/forecast/latest", num_requests=300, concurrency=12)
    b_history = benchmark_endpoint("Market OHLCV 1Y", "/api/market/history?range=1Y", num_requests=200, concurrency=10)
    b_preds = benchmark_endpoint("Prediction History DB", "/api/forecast/history?page=1&pageSize=20", num_requests=200, concurrency=10)


if __name__ == "__main__":
    run_full_load_benchmark()
