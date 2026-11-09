# Experiments

## experiments.md

`exp id | cell# | hypothesis | change vs parent | seeds | metric mean ± std | test | runtime | GPU | config hash | verdict`

- One factor per experiment (change vs parent = exactly one thing).
- Seeds everywhere (python, numpy, torch/tf, cv splits). Print library versions once (setup cell).
- Save config JSON next to metrics (`/kaggle/working/config_cellNN.json`); config hash = first 8 hex of sha1 of the sorted JSON.
- ≥3 seeds for key comparisons; ask first if the multi-seed run is >15 min.
- Baselines first: E0 trivial (majority / mean / simple linear), E1 literature-strength baseline.

## Ablate (`/resbot:ch7 ablate <n>`)

1. Read experiment n's row and `cells/cell_NN.py`. List its components (augmentations, features, loss, schedule…).
2. Plan one-factor-at-a-time ablations: remove/revert ONE component per run, same seeds, same splits.
3. Estimate runtime; ask if total >15 min. Then run them one cell at a time through the loop.
4. Table into experiments.md + a short "Ablations" summary in `state.md` (which components matter, Δ ± std).

## Compare (`/resbot:ch7 compare <a> <b>`)

1. Read both rows; per-seed (or per-fold) scores must exist (from `metrics_cellNN.csv`). If not, say what to re-run.
2. Same seeds/folds → paired t-test on the differences (`scipy.stats.ttest_rel`) and a bootstrap 95% CI of the mean difference.
   Unpaired → Welch t-test + bootstrap CI.
3. Run the stats in a notebook cell, or locally with `python3` if per-seed values are in the workspace.
4. Report: `a: mean ± std (n)`, `b: mean ± std (n)`, Δ, CI, p, verdict (significant at 0.05 or not; n<3 → inconclusive).
5. Update the `test` column and the linked hypothesis status.
