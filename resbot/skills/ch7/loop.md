# The one-cell loop

Never write cell N+1 before cell N is analyzed and recorded.

## Steps

1. **THINK** (2–3 lines, shown in chat): what the last output showed → which hypothesis / question this
   cell tests → the expected output (numbers, shape, or "no error").
2. **WRITE** one cell with one purpose, under ~40 lines. Follow [token-rules.md](token-rules.md) for
   printing. Training cells: fixed seeds, save `/kaggle/working/metrics_cellNN.csv` and
   `/kaggle/working/config_cellNN.json`, print 3–6 summary lines only.
3. **SAVE** to `cells/cell_NN.py` (NN = zero-padded position in the notebook).
4. **INSERT** below the last RESBOT cell (or at the end) per [browser.md](browser.md) §Insert.
5. **VERIFY**: read the editor text back; compare to the file after normalizing trailing whitespace.
   Mismatch → clear the cell, re-insert once with the fallback path; still mismatch → stop and report.
6. **RUN** in place (§Run). Mark the row `running` in `cell_tree.md`.
7. **WAIT** with backoff: `sleep 5`, `15`, `30`, `60`, then every 60s. Expected training time >2 min:
   poll every 3–5 min. Expected >15 min: ask the user first (see SKILL.md §6).
8. **READ** in one JS call (§Read): `{lines, text (capped), error, images}`.
9. **ANALYZE**: does it match the expectation? Numbers plausible? Run the sanity checks below.
10. **RECORD**:
    - `outputs/cell_NN.md` (≤10 lines: key numbers, error summary, image finding as text)
    - `cell_tree.md` row: `# | type | purpose | defines | needs | status | key result`
    - `notes/experiments.md` + `notes/hypotheses.md` if it was an experiment
    - `state.md`: last cell, best result ± std, active hypothesis, next cell plan
11. **DECIDE**: next cell, fix (max 3 attempts per cell), or ask.

## cell_tree.md

`type` ∈ setup, data, eda, feature, model, train, eval, plot, analysis, submit.
`status` ∈ `ok`, `err`, `stale`, `running`, `user`. Never edit or delete `user` cells without asking.

## Errors

- Read the last 25 traceback lines only. Fix the root cause in the SAME cell (edit, re-verify, re-run).
- After 3 failed fixes on one cell: stop, show the error + what you tried, ask.
- `NameError` for a name defined earlier usually means the kernel restarted → Resume §5.

## Sanity checks (extra care here)

- **Data loading:** shapes, dtypes, nulls, duplicates, target distribution; write `notes/dataset_card.md` on first load.
- **Splits:** no ID/group overlap between train/valid; duplicates across folds; time order for temporal data;
  stratification for imbalance. Fit scalers/encoders/target-encoding inside the fold only (leakage).
- **Model definition:** parameter count, output shape vs number of classes, loss matches the task.
- **Training loop:** loss decreases; train vs val gap; no `model.eval()`/`train()` mix-ups; LR schedule steps.
- **Metrics:** compare with sklearn on a small slice; check the competition metric direction and averaging.
- **Surprising results** (too good or too bad): suspect a leak or a bug before celebrating. Shuffle-label test
  (metric should drop to chance), and check the 10 worst/best samples.

## After key results

Error analysis (per-class metrics, 10 worst samples, calibration/ECE), then 1–3 ranked ideas into
`notes/ideas.md` (paper-inspired ones carry their citation). Refresh the graph every ~10 cells ([graph.md](graph.md)).
