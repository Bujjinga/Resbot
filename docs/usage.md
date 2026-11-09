# Using RESBOT

All work happens through one command, `/resbot:ch7`, typed inside Claude Code. What it does depends
on what you type after it.

## Modes

### Start: `/resbot:ch7 <kaggle-url> [goal]`

Begins a new session on a notebook.

```
/resbot:ch7 https://www.kaggle.com/code/alice/chest-xray-cnn reach 0.95 AUC
```

Creates the workspace, opens the notebook in a new tab, maps the existing cells, writes hypotheses, starts the loop.

### Resume: `/resbot:ch7` or `/resbot:ch7 <instruction>`

Continues where you left off. Extra text is treated as a new instruction:

```
/resbot:ch7 focus on class imbalance next
```

### Research: `/resbot:ch7 research <question>`

Searches papers (Consensus, Semantic Scholar, arXiv, Crossref, then the web) and the Kaggle
community. **Does not touch the notebook.**

```
/resbot:ch7 research does mixup help small medical image datasets
```

Writes `notes/literature.md`, `notes/kaggle_intel.md`, new hypotheses and ranked ideas.

### Paper: `/resbot:ch7 paper <arxiv-id | doi | pdf-path>`

Summarizes one paper into `papers/<id>.md`: problem, method, dataset, metric, numbers, code link,
what is reusable for your notebook. Adds a BibTeX entry.

```
/resbot:ch7 paper 1512.03385
/resbot:ch7 paper 10.1109/CVPR.2016.90
/resbot:ch7 paper ~/Downloads/some-paper.pdf
```

### Plot: `/resbot:ch7 plot <cell#>`

Looks at a cell's image output (loss curves, confusion matrix, sample grids, Grad-CAM, class
distribution) and writes what it found as text.

```
/resbot:ch7 plot 12
```

### Ablate: `/resbot:ch7 ablate <cell#>`

Removes one component at a time from an experiment (same seeds and splits) to show what each part contributes.

```
/resbot:ch7 ablate 15
```

### Compare: `/resbot:ch7 compare <exp-a> <exp-b>`

Tests whether one experiment is really better than another: mean ± std, paired t-test or bootstrap
confidence interval.

```
/resbot:ch7 compare E4 E2
```

### Report: `/resbot:ch7 report`

Writes `notes/report.md` (abstract, problem, data, methods, experiments, ablations, error analysis,
limitations, related work, reproducibility), plus `results.csv` and `references.bib`.
Only verified citations are included.

### Graph: `/resbot:ch7 graph`

Rebuilds or queries the graphify knowledge graph of your workspace (if graphify is installed).

### Status: `/resbot:ch7 status`

Prints the goal, active hypothesis, best result ± std and the next planned cell. No browser use.

## How the loop works

For every cell RESBOT:

1. **Thinks**: what the last output showed, which hypothesis this cell tests, what output it expects.
2. **Writes** one small cell (under ~40 lines) and saves it to `cells/cell_NN.py`.
3. **Inserts** it into the notebook and **checks** the editor text matches the saved file.
4. **Runs** it and **waits** (checks after 5s, 15s, 30s, 60s; every 3–5 minutes for training).
5. **Reads** a capped part of the output (or the end of the error).
6. **Analyzes** it, **records** the result, and **decides** the next step.

It never writes the next cell before the current one is analyzed. If a cell fails 3 times it stops and shows you the error.

It pays extra attention to data loading, splits, model definition, the training loop and metrics,
and checks for leakage, duplicates across folds and metric bugs, especially when a result looks too good.

## When RESBOT asks you first

- training or multi-seed runs expected to take more than 15 minutes
- changing the accelerator (GPU/TPU), turning internet on or off, adding datasets
- Save Version, `kaggle kernels push`, or any competition submission
- editing or deleting cells you wrote
- posting anything on Kaggle (it never does this on its own)
- trying a fourth fix on the same failing cell

It never types passwords or API tokens, and the browser only acts on kaggle.com.

## The workspace

Everything RESBOT knows is saved as plain text in `resbot-workspace/<notebook>/`, so you can read it,
edit it, or put it in your own git repo.

| File | Contents |
|---|---|
| `config.md` | notebook URL, how the editor was driven, whether the Kaggle CLI is available |
| `state.md` | goal, active hypothesis, best result, next step, your instructions |
| `cell_tree.md` | one row per cell: type, purpose, what it defines/needs, status, key result |
| `cells/cell_NN.py` | the exact code of each cell RESBOT wrote |
| `outputs/cell_NN.md` | a ≤10-line summary of each output |
| `notes/hypotheses.md` | claim, test, expected result, status (open/supported/rejected/inconclusive), evidence |
| `notes/experiments.md` | exp id, cell, hypothesis, change, seeds, metric mean ± std, test, runtime, GPU, config hash, verdict |
| `notes/literature.md` | papers found (verified ids only count) |
| `notes/kaggle_intel.md` | CV scheme, best scores, tricks and known leaks from top notebooks/discussions |
| `notes/dataset_card.md` | size, classes, imbalance, splits, licence, known issues |
| `notes/ideas.md` | 1–3 ranked next experiments |
| `notes/report.md`, `results.csv`, `references.bib` | the final write-up |
| `papers/<id>.md` | one summary per paper |

Cell status values: `ok`, `err`, `stale` (kernel restarted), `running`, `user` (a cell you wrote).

## Research rules RESBOT follows

- Baselines first: a trivial baseline, then a strong baseline from the literature.
- One change per experiment, seeds everywhere, at least 3 seeds for important comparisons.
- Every training run saves its metrics and config next to each other so results are reproducible.
- A paper only counts if its DOI or arXiv id came from a real search API. Anything else is marked
  `UNVERIFIED` and left out of the report. Papers, authors and numbers are never made up.
