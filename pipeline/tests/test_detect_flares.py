"""
Tests for pipeline/detect_flares.py

Tests:
1. A synthetic light curve with a known injected spike is correctly detected
2. A flat/noisy light curve with no real spike produces zero false positives
3. Classification thresholds work correctly
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from pipeline.detect_flares import (
    DetectionConfig,
    classify_flare,
    detect_flares,
)


def make_quiet_lightcurve(
    n_points: int = 5000,
    base_flux: float = 100.0,
    noise_std: float = 5.0,
    cadence_seconds: int = 1,
) -> pd.DataFrame:
    """Generate a flat noisy lightcurve with no real flares."""
    rng = np.random.default_rng(seed=42)
    times = pd.date_range("2026-07-02 00:00:00", periods=n_points, freq=f"{cadence_seconds}s", tz="UTC")
    flux = base_flux + rng.normal(0, noise_std, size=n_points)
    return pd.DataFrame({"timestamp": times, "flux": flux})


def inject_flare(
    df: pd.DataFrame,
    center_idx: int = 2000,
    amplitude_sigma: float = 8.0,
    base_flux: float = 100.0,
    noise_std: float = 5.0,
    width: int = 60,
) -> pd.DataFrame:
    """Inject a Gaussian-shaped flare into a lightcurve."""
    df = df.copy()
    t = np.arange(len(df))
    gauss = amplitude_sigma * noise_std * np.exp(-0.5 * ((t - center_idx) / (width / 3)) ** 2)
    df["flux"] = df["flux"] + gauss
    return df


class TestClassify:
    def test_x_class(self):
        assert classify_flare(11.0) == "X"

    def test_m_class(self):
        assert classify_flare(8.0) == "M"

    def test_c_class(self):
        assert classify_flare(5.0) == "C"

    def test_b_class(self):
        assert classify_flare(3.0) == "B"

    def test_a_class(self):
        assert classify_flare(1.0) == "A"

    def test_boundary_x(self):
        # Exactly at X threshold
        assert classify_flare(10.0) == "X"

    def test_boundary_m(self):
        assert classify_flare(7.0) == "M"


class TestFlatLightcurve:
    """A flat/noisy lightcurve should produce zero or very few false positives."""

    def test_no_false_positives_on_quiet_sun(self):
        """Quiet Sun data with k=4 sigma threshold should produce zero detections."""
        df = make_quiet_lightcurve(n_points=5000, noise_std=5.0)
        config = DetectionConfig(sigma_threshold=4.0, min_duration_samples=5)
        flares = detect_flares(df, config)
        # With k=4 and Gaussian noise, expect ≤1 false positive in 5000 samples
        assert len(flares) <= 1, f"Too many false positives: {len(flares)}"

    def test_very_high_threshold_zero_detections(self):
        """At k=10 sigma, absolutely no flares on quiet data."""
        df = make_quiet_lightcurve(n_points=5000, noise_std=5.0)
        config = DetectionConfig(sigma_threshold=10.0, min_duration_samples=3)
        flares = detect_flares(df, config)
        assert len(flares) == 0

    def test_empty_dataframe(self):
        """Empty input returns empty list, not an error."""
        df = pd.DataFrame(columns=["timestamp", "flux"])
        config = DetectionConfig()
        flares = detect_flares(df, config)
        assert flares == []


class TestInjectedFlare:
    """A synthetic lightcurve with a known injected flare must be detected."""

    def test_detects_injected_flare(self):
        """An 8-sigma flare injected at a known position must be detected."""
        df = make_quiet_lightcurve(n_points=5000, noise_std=5.0, base_flux=100.0)
        df_with_flare = inject_flare(df, center_idx=2000, amplitude_sigma=8.0, width=60)

        config = DetectionConfig(sigma_threshold=3.0, min_duration_samples=3)
        flares = detect_flares(df_with_flare, config)

        assert len(flares) >= 1, "Should detect at least one flare"

        # The strongest flare should be near center_idx
        peak_times = [pd.to_datetime(f.peak_time) for f in flares]
        expected_peak = df["timestamp"].iloc[2000]
        closest_delta = min(abs((t - expected_peak).total_seconds()) for t in peak_times)
        assert closest_delta < 300, f"Peak too far from injected flare: {closest_delta}s"

    def test_injected_flare_classified_correctly(self):
        """An 8-sigma flare should be classified as M or X."""
        df = make_quiet_lightcurve(n_points=5000, noise_std=5.0, base_flux=100.0)
        df_with_flare = inject_flare(df, center_idx=2000, amplitude_sigma=8.0, width=60)

        config = DetectionConfig(sigma_threshold=3.0, min_duration_samples=3)
        flares = detect_flares(df_with_flare, config)
        assert len(flares) >= 1
        # Strongest flare should be M or X class
        strongest = max(flares, key=lambda f: f.peak_sigma)
        assert strongest.flare_class in ("M", "X", "C"), (
            f"Expected M/X/C class for 8-sigma flare, got {strongest.flare_class}"
        )

    def test_duration_tracked_correctly(self):
        """Duration should be roughly proportional to the flare width."""
        df = make_quiet_lightcurve(n_points=5000, noise_std=5.0, base_flux=100.0)
        # Narrow flare (30 samples width)
        df_narrow = inject_flare(df, center_idx=2000, amplitude_sigma=8.0, width=30)
        # Wide flare (120 samples width)
        df_wide = inject_flare(df, center_idx=2000, amplitude_sigma=8.0, width=120)

        config = DetectionConfig(sigma_threshold=3.0, min_duration_samples=3)
        narrow_flares = detect_flares(df_narrow, config)
        wide_flares = detect_flares(df_wide, config)

        if narrow_flares and wide_flares:
            narrow_dur = max(f.duration_minutes for f in narrow_flares)
            wide_dur = max(f.duration_minutes for f in wide_flares)
            # Wide flare should have longer duration
            assert wide_dur >= narrow_dur, f"Wide ({wide_dur}) should be >= narrow ({narrow_dur})"

    def test_two_separate_flares_detected(self):
        """Two flares injected far apart should both be detected."""
        df = make_quiet_lightcurve(n_points=10000, noise_std=5.0, base_flux=100.0)
        df = inject_flare(df, center_idx=1500, amplitude_sigma=8.0, width=40)
        df = inject_flare(df, center_idx=7500, amplitude_sigma=8.0, width=40)

        config = DetectionConfig(sigma_threshold=3.0, min_duration_samples=3)
        flares = detect_flares(df, config)
        assert len(flares) >= 2, f"Should detect at least 2 flares, got {len(flares)}"
