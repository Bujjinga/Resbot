# Token rules (always on)

- **Text before pixels.** Read printed output first; screenshot only if numbers can't answer the question; zoom to the region.
- **Output caps:** first 15 + last 30 lines, max 3,000 chars. Errors: last 25 traceback lines only.
- **Never re-open old outputs.** `outputs/cell_NN.md` (≤10 lines) is the memory.
- **Code prints summaries**, not data: `df.shape`, `.head(3)`, value counts top 10, `describe()` on few columns.
- **Progress bars:** `tqdm(..., mininterval=60)`; Keras `verbose=2`; LightGBM/XGBoost log every ≥100 rounds.
- **Training cells** save `/kaggle/working/metrics_cellNN.csv` and print 3–6 summary lines.
- **Plot cells** print the key numbers they visualize.
- **Polling:** 5s/15s/30s/60s backoff; training every 3–5 min.
- **Chat:** short updates, one line per cell; details go into workspace files.
- **Reads:** on resume read only `state.md`, `cell_tree.md`, `config.md`, top of `hypotheses.md`. Read a PDF once into `papers/`.
- **Browser JS:** one JS call per read; return JSON, already capped.
