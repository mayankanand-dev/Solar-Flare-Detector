import os
import json
from backend.main import get_flares, get_lightcurve, get_stats, get_metrics

def main():
    print("Exporting backend data to static files for Vercel deployment...")
    out_dir = os.path.join("frontend", "public", "data")
    os.makedirs(out_dir, exist_ok=True)
    
    # Export Flares
    flares_data = get_flares()
    with open(os.path.join(out_dir, "flares.json"), "w") as f:
        json.dump(flares_data, f)
    print("Exported flares.json")
    
    # Export Stats
    stats_data = get_stats()
    with open(os.path.join(out_dir, "stats.json"), "w") as f:
        json.dump(stats_data, f)
    print("Exported stats.json")
    
    # Export Metrics
    metrics_data = get_metrics()
    with open(os.path.join(out_dir, "metrics.json"), "w") as f:
        json.dump(metrics_data, f)
    print("Exported metrics.json")
    
    # Export Downsampled Lightcurve (as JSON)
    resp = get_lightcurve(downsample=2000, range=None, start=None, end=None)
    with open(os.path.join(out_dir, "lightcurve.json"), "w") as f:
        json.dump(resp, f)
    print("Exported lightcurve.json")
    
    print("Done! Data is now statically available in frontend/public/data/")

if __name__ == "__main__":
    main()
