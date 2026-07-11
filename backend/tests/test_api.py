"""
Backend API tests — Solar Flare Detector
Tests all endpoints for correct shape/status using synthetic data.
"""
import json
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Create synthetic test data before importing app
@pytest.fixture(scope="module", autouse=True)
def synthetic_data(tmp_path_factory):
    """Create synthetic lightcurve and flares for testing."""
    import numpy as np
    tmp = tmp_path_factory.mktemp("data")

    # Synthetic lightcurve
    n = 1000
    times = pd.date_range("2026-07-02 00:00:00", periods=n, freq="1s", tz="UTC")
    flux = 100.0 + np.random.default_rng(42).normal(0, 5, n)
    df = pd.DataFrame({"timestamp": times, "flux": flux})
    lc_path = tmp / "lightcurve.csv"
    df.to_csv(lc_path, index=False)

    # Synthetic flares
    flares_data = {
        "generated_at": "2026-07-11T00:00:00",
        "source": "TEST",
        "flare_count": 2,
        "flares": [
            {
                "id": 1,
                "start_time": "2026-07-02T00:01:00+00:00",
                "peak_time": "2026-07-02T00:02:00+00:00",
                "end_time": "2026-07-02T00:03:00+00:00",
                "peak_flux": 150.0,
                "background_flux": 100.0,
                "peak_sigma": 8.5,
                "duration_minutes": 2.0,
                "flare_class": "M",
                "instrument": "HEL1OS",
                "note": "test",
            },
            {
                "id": 2,
                "start_time": "2026-07-02T00:05:00+00:00",
                "peak_time": "2026-07-02T00:06:00+00:00",
                "end_time": "2026-07-02T00:07:00+00:00",
                "peak_flux": 200.0,
                "background_flux": 100.0,
                "peak_sigma": 12.0,
                "duration_minutes": 2.0,
                "flare_class": "X",
                "instrument": "HEL1OS",
                "note": "test",
            },
        ],
    }
    flares_path = tmp / "flares.json"
    flares_path.write_text(json.dumps(flares_data))

    # Patch backend to use our test data
    import backend.main as main_module
    main_module.LIGHTCURVE_CSV = lc_path
    main_module.FLARES_JSON = flares_path
    # Reset cached state
    main_module._lightcurve = None
    main_module._flares = None
    main_module._flares_meta = None

    yield lc_path, flares_path


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from backend.main import app
    return TestClient(app)


class TestHealth:
    def test_health_ok(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


class TestLightcurve:
    def test_lightcurve_returns_200(self, client):
        r = client.get("/api/lightcurve")
        assert r.status_code == 200
        data = r.json()
        assert "timestamps" in data
        assert "flux" in data
        assert data["n_points"] > 0

    def test_lightcurve_timestamps_and_flux_same_length(self, client):
        r = client.get("/api/lightcurve")
        data = r.json()
        assert len(data["timestamps"]) == len(data["flux"])

    def test_lightcurve_downsample(self, client):
        r = client.get("/api/lightcurve?downsample=100")
        assert r.status_code == 200
        data = r.json()
        assert data["n_points"] <= 100

    def test_lightcurve_date_range(self, client):
        r = client.get("/api/lightcurve?start=2026-07-02T00:05:00&end=2026-07-02T00:10:00")
        assert r.status_code == 200


class TestFlares:
    def test_get_all_flares(self, client):
        r = client.get("/api/flares")
        assert r.status_code == 200
        data = r.json()
        assert "flares" in data
        assert "count" in data
        assert data["count"] == 2

    def test_flare_structure(self, client):
        r = client.get("/api/flares")
        flares = r.json()["flares"]
        assert len(flares) >= 1
        f = flares[0]
        required_keys = ["id", "start_time", "peak_time", "end_time",
                         "flare_class", "peak_flux", "duration_minutes"]
        for key in required_keys:
            assert key in f, f"Missing key: {key}"


class TestFlareDetail:
    def test_get_existing_flare(self, client):
        r = client.get("/api/flares/1")
        assert r.status_code == 200
        data = r.json()
        assert "flare" in data
        assert "lightcurve_window" in data
        assert data["flare"]["id"] == 1

    def test_get_nonexistent_flare_404(self, client):
        r = client.get("/api/flares/9999")
        assert r.status_code == 404
        data = r.json()
        assert "detail" in data

    def test_lightcurve_window_structure(self, client):
        r = client.get("/api/flares/1")
        window = r.json()["lightcurve_window"]
        assert "timestamps" in window
        assert "flux" in window
        assert len(window["timestamps"]) == len(window["flux"])


class TestReplayStatus:
    def test_replay_status_returns_200(self, client):
        r = client.get("/api/replay/status")
        assert r.status_code == 200
        data = r.json()
        assert "mode" in data
        assert "REPLAY" in data["mode"]

    def test_replay_has_disclaimer(self, client):
        r = client.get("/api/replay/status")
        data = r.json()
        assert "disclaimer" in data

    def test_replay_flare_active_is_bool(self, client):
        r = client.get("/api/replay/status")
        data = r.json()
        assert isinstance(data["flare_active"], bool)


class TestStats:
    def test_stats_endpoint(self, client):
        r = client.get("/api/stats")
        assert r.status_code == 200
        data = r.json()
        assert "lightcurve" in data
        assert "flares" in data
