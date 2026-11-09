# Graph (optional, graphify)

Check once: `graphify --version`. If it fails, use Grep over the workspace instead and say so once.

## When

- every ~10 cells
- after a research pass
- `/resbot:ch7 graph`

## How

- Build/refresh (no LLM needed): `graphify update resbot-workspace/<slug>`
  (writes `resbot-workspace/<slug>/graphify-out/graph.json`; add `--force` after deleting many files).
- Pass `--graph resbot-workspace/<slug>/graphify-out/graph.json` to the commands below.
- Query instead of re-reading files:
  - `graphify query "<question>"`: e.g. "which cells define the CV folds"
  - `graphify path "<node A>" "<node B>"`: e.g. how a hypothesis links to an experiment
  - `graphify explain "<node>"`

Use the graph to answer "what depends on what" and "what did we already try"; never to replace
`state.md` / `cell_tree.md` as the source of truth.
