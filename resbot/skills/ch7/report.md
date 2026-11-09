# Report (`/resbot:ch7 report`)

Build from workspace files only (no browser): `state.md`, `notes/*.md`, `cell_tree.md`, `outputs/*.md`.

## notes/report.md sections

1. **Abstract**: goal, best result ± std, the one finding that mattered.
2. **Problem**: task, metric, constraints.
3. **Data**: from `dataset_card.md` (size, classes, imbalance, splits, licence, known issues).
4. **Methods**: baselines + final pipeline.
5. **Experiments**: table from `experiments.md` (mean ± std, seeds, test).
6. **Ablations**: what each component contributes.
7. **Error analysis**: per-class metrics, worst samples, calibration (ECE).
8. **Limitations**: leakage risks, small n, compute limits, untested assumptions.
9. **Related work**: VERIFIED citations only (DOI/arXiv from an API response).
10. **Reproducibility**: versions, seeds, config hashes, notebook URL + version, how to rerun.

## Also write

- `notes/results.csv`: `exp_id,hypothesis,metric,mean,std,n_seeds,verdict` (one row per experiment).
- `notes/references.bib`: BibTeX from API metadata only; no UNVERIFIED entries.

Keep it factual; every number must trace to an `outputs/` or `experiments.md` entry.
