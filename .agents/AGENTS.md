# Solar Sentinel: Workspace Agent Rules (AGENTS.md)

## 🚨 MANDATORY FIRST STEP
Read [context.md](file:///c:/Users/mayank/Desktop/Solar%20Sentinel/context.md) before making any changes.

---

## Core Rules

1. **Model:** XGBoost only. The Two-Tower TCN has been removed from this project. Do not recreate TCN files.

2. **Rolling windows:** Always `center=False` in all calls to `.rolling()` inside `engineer_features()`. Never use `center=True` — it leaks future data into features.

3. **Forecast horizon:** `predict_horizon_minutes = 30`. Do not revert to 10 minutes.

4. **Dataset splits:** Use Stratified Daily Block Partitioning (24h blocks distributed across Active/Quiet pools). Never use simple chronological tail splits — the July 2026 tail has 0 NOAA labels and causes division-by-zero F1.

5. **Evaluation — always report both:**
   - **Holdout test set F1** (strictly unseen 30% blocks) — the canonical benchmark.
   - **Full-mission backtest F1** (all 76k rows incl. training data) — clearly labelled as not a generalization proof.

6. **Terminal commands (run from project root, not as background processes):**
   ```powershell
   .\venv\Scripts\python -m pipeline.train_model    # retrain XGBoost
   run.bat                                           # start full app
   ```
