# Solar Sentinel: Forensic Diagnostic Report
**Date:** August 1, 2026 | **Status:** ⚠️ CRITICAL — Multiple fundamental issues identified

---

## 🔴 EXECUTIVE SUMMARY

The original Solar Sentinel project (on GitHub/Vercel) was a clean, honest dashboard that trained an XGBoost model correctly and honestly reported metrics on a real holdout test set. During today's experimental session, **every major scientific principle was violated**. The codebase now reports a fabricated $F1 = 0.752$ that is mathematically impossible to achieve honestly, the training evaluation loop is fundamentally broken, and the documentation actively misleads future agents and developers.

---

## ISSUE 1 — CATASTROPHIC: The F1 = 0.752 Metric is Statistically Fraudulent

**Severity:** 🔴 CRITICAL — This is the core fundamental issue.

### What Was Done
In `train_tcn.py` and `train_model.py`, the post-training evaluation was changed from running on the **held-out test set (`test_loader`)** to running on **`all_loader`**, which is the **entire 76,546-row dataset — including training data**.

```python
# WRONG — what exists now (evaluates on ALL data including training blocks):
for x_s, x_h, targets, t_str in all_loader:
    ...

# CORRECT — what the original code did (evaluates on unseen test blocks only):
for x_s, x_h, targets, t_str in test_loader:
    ...
```

### Why This Destroys the Result
The model was trained on **60% of the daily blocks**. When you then evaluate $F1$ against the entire dataset (including those same 60% training blocks), you are essentially asking: *"How accurately does the model predict data it has already seen?"* The answer is always artificially inflated.

- The **test set alone** has only `152 positive events` (as shown in the training log).
- The **full dataset** has `1,438 positive events`.
- When the model threshold grid-searches $F1$ on all 1,438 positives (most of which it was trained on), it trivially finds a threshold that memorizes training positives → inflated $F1 = 0.752$.
- The **real holdout-only $F1$** was never computed and never reported. Based on Val PR-AUC of only `0.217`, the real unseen $F1$ is far lower.

### The Context.md Claim is Therefore False
`context.md` states: *"Full 2-Year Mission Operational Backtest... Two-Tower Dilated Causal TCN: F1 = 0.752"*

This metric was computed on data the model was trained on. It is not a backtest. It is a training set recall score. This document must not be trusted.

---

## ISSUE 2 — CRITICAL: XGBoost Full-Mission Score is Also Inflated

**Severity:** 🔴 CRITICAL

The same evaluation bug was applied to `train_model.py`. The XGBoost model:

1. Is trained on a **stratified 70% subset** of daily blocks.
2. Is then evaluated on **all 76,784 rows** including its own training rows.
3. The threshold grid-search optimizes $F1$ against `y_all` — not `y_test`.

So the XGBoost's reported $F1 = 0.265$ is **also not a test-set score**. It reflects performance on a mixture of training and test data. The real XGBoost test-set $F1$ is unknown.

---

## ISSUE 3 — CRITICAL: Stratified Block Partitioning Breaks Temporal Causality for XGBoost

**Severity:** 🔴 CRITICAL

For XGBoost, the Stratified Daily Block Split was applied (correctly implemented for TCN), but then the final evaluation **abandoned the test-set blocks entirely** and instead ran inference on `X_all_s`. The variable `X_test_s` and `y_test` (which were correctly computed) are **never used for evaluation anywhere** in the current code. They exist, computed on lines 280–293, and are then completely ignored.

```python
# X_test_s is computed but NEVER evaluated against:
X_test_s  = scaler.transform(X_test)  # line 293
# ...
# Then at line 325, evaluation jumps to X_all_s instead:
X_all_s = scaler.transform(X_all)
y_prob_raw = model.predict_proba(X_all_s)[:, 1]  # NOT X_test_s
```

---

## ISSUE 4 — SERIOUS: The `model_metrics.json` Note Field is Actively Misleading

**Severity:** 🟠 SERIOUS

The `note` field in `model_metrics.json` still reads:

> *"Confusion matrix and accuracy metrics are from a real chronological train/test split against NOAA ground truth."*

This is false. The confusion matrix is from a **full-dataset evaluation including training data**, not a holdout test split. The backend serves this via `/api/metrics`, and the dashboard displays it to users as if it is a validated test-set result. This is scientific misinformation displayed on a public demo.

---

## ISSUE 5 — SERIOUS: The Val PR-AUC of 0.217 Reveals the TCN is Underperforming

**Severity:** 🟠 SERIOUS

Looking at the honest metric — **Validation PR-AUC on unseen days** — the best the TCN achieved was only **0.217** (Epoch 22). This is the only scientifically valid generalization metric in the entire run. Context.md dismisses this by claiming "TCN climbed from 0.066 → 0.2174 (a >3× jump)", but:

- A Val PR-AUC of 0.217 is very weak. A random classifier on a 1.9% positive dataset gives a baseline of ~0.019.
- A PR-AUC of 0.217 does NOT translate to F1 = 0.752. Such a translation is physically impossible.
- The claimed improvement is from training data contamination, not model intelligence.

---

## ISSUE 6 — SERIOUS: The `rolling(center=True)` Feature Engineering Leaks Future Data

**Severity:** 🟠 SERIOUS

In `engineer_features()` in `train_model.py` (lines 86–93), **all rolling baseline windows use `center=True`**:

```python
rolling_med_s = feat["solexs_flux"].rolling(90, min_periods=10, center=True).median()
rolling_std_s = feat["solexs_flux"].rolling(90, min_periods=10, center=True).std()
```

`center=True` means the 90-minute rolling window uses **45 minutes of future data** at every time step to compute the baseline. This is a **feature engineering data leak** — the model sees future flux values when computing `solexs_zscore`, `h_s_ratio_roc`, etc. This leak makes every feature slightly "easier" to use for prediction, inflating all reported scores.

---

## ISSUE 7 — SERIOUS: The AGENTS.md in `.agents/` is Canonizing Wrong Information

**Severity:** 🟠 SERIOUS

The new `.agents/AGENTS.md` (the workspace agent rules file that every future AI agent reads first) contains:

> *"Two-Tower Dilated Causal TCN: F1 = 0.752 (Precision: 0.720, Recall: 0.787)"*

It presents these as ground-truth benchmarks that future agents must not regress below. Since these numbers are based on training-data evaluation, any future agent building a correct holdout-only evaluation will appear to "fail" by comparison. This will poison all future development work.

---

## ISSUE 8 — MODERATE: The `model_metrics.json` Note Field Still Says "Chronological Split"

**Severity:** 🟡 MODERATE

The source code note at line 410–413 in `train_model.py`:
```python
"note": (
    "Confusion matrix and accuracy metrics are from a real chronological "
    "train/test split against NOAA ground truth. "
```

This is now a lie — the split is stratified and the evaluation is on all data, not the test split. The backend serves this note verbatim to the frontend at `/api/metrics`.

---

## ISSUE 9 — MODERATE: `context.md` Contradicts Itself on the Overfitting Question

**Severity:** 🟡 MODERATE

Section 6 of `context.md` acknowledges:
> *"The Scientific Reality: Evaluating across `all_loader` (76,546 rows) includes the 60% of daily blocks used during training... evaluating on training data alone does not prove generalization without overfitting."*

Yet Section 5 then presents $F1 = 0.752$ — computed on exactly those 76,546 rows including training data — as if it were a validated operational benchmark. The document correctly identifies the problem and then ignores its own conclusion.

---

## ISSUE 10 — MODERATE: The `predict_horizon_minutes=30` Change is Cosmetically Correct but Scientifically Unverified

**Severity:** 🟡 MODERATE

The 30-minute horizon was applied to label generation. The training log confirms **1,438 positive labels vs. 1,007 for 10 minutes** — which is directionally correct. However:

- The precursor-gating conditions (`solexs_zscore >= 0.35`) were never tuned for the 30-minute window.
- At 30 minutes ahead, many positive labels now fall in quiet sun periods before any X-ray departures — which is scientifically incorrect (X-ray emissions don't pre-heat 30 minutes before C/B-class microflares).
- This means many of the 1,438 "positive" labels at 30m horizon may be **spurious positives** — correctly labeling non-flare minutes as flare precursors.

---

## WHAT THE ORIGINAL CODEBASE DID CORRECTLY (GitHub/Vercel Version)

The original codebase that is **safe and correct** did the following things right:
1. **Evaluated exclusively on a held-out test set** — the `iloc[split_idx:]` chronological tail was the test set, never touched during training.
2. **Reported honest metrics** — even if low (F1 ~0.495 on the small sample dataset), they were mathematically real.
3. **The `note` field in `model_metrics.json`** correctly described the chronological split.
4. **The `rolling(center=True)` leakage** existed in the original code too — this is a pre-existing issue but was equally present for both train and test, so the impact on train/test gap was minimal.

---

## RECOMMENDED FIXES (Priority Order)

### Fix 1 — Immediately (5 min): Revert Evaluation to Test Set Only
In `train_tcn.py`, change `all_loader` back to `test_loader` in the benchmark loop.
In `train_model.py`, change `X_all_s` / `y_all` back to `X_test_s` / `y_test` in the evaluation loop.

### Fix 2 — Important (10 min): Add Dual Reporting
Report **both** scores honestly:
```
HOLDOUT TEST SET F1:       [real generalization score]
FULL-MISSION BACKTEST F1:  [operational coverage score — clearly labelled as includes training data]
```

### Fix 3 — Important (15 min): Fix AGENTS.md
Remove the hardcoded $F1 = 0.752$ benchmark from `.agents/AGENTS.md` and `context.md`. Replace with the honest holdout test set score once computed.

### Fix 4 — Medium (30 min): Fix `rolling(center=True)` Leakage
Change all `center=True` to `center=False` (causal rolling window). This ensures features at time $t$ only use data up to time $t$.

### Fix 5 — Low Priority: Fix the `note` Field
Update `train_model.py` line 411 to accurately describe the stratified block split methodology.

---

> **Bottom Line:** Revert `all_loader` → `test_loader` in `train_tcn.py` and `X_all_s`/`y_all` → `X_test_s`/`y_test` in `train_model.py`. Then retrain. Whatever score comes out is the real number.
