# Graph (built in: `resbot graph`)

RESBOT keeps a small knowledge graph of the workspace so you can answer "what depends on what" and
"what did we already try" without re-reading files. It is built from the workspace's own files by a
bundled script; nothing to install.

```
G="${CLAUDE_SKILL_DIR}/scripts/graph.js"
W=resbot-workspace/<slug>
```

## When

- every ~10 cells
- after a research pass
- `/resbot:ch7 graph` (build, then show `graph/GRAPH.md`)

## Commands

| Need | Command |
|---|---|
| Build / refresh | `node "$G" build "$W"`: writes `graph/graph.json` and the summary `graph/GRAPH.md` |
| Ask a question | `node "$G" query "$W" "which cell defines the folds"` |
| How two things connect | `node "$G" path "$W" E3 H1` |
| Everything about one node | `node "$G" explain "$W" cell:07` |

Names can be ids (`cell:07`, `7`, `H2`, `E3`, `paper:1512.03385`) or words from a label.
Exit code 3 = ambiguous name (candidates are listed, pick one); 4 = no match.

## What is in it

- **Nodes:** cells (from `cell_tree.md` + `cells/*.py`), hypotheses, experiments, papers
  (`literature.md` + `papers/`), ideas.
- **Edges:** `needs` (cell uses a name an earlier cell defines), `ran_in` (experiment → cell),
  `tests` (experiment → hypothesis), `mentions` (text names H#/E#/cell #), `cites` (text names a paper id).

## Rules

- Read `graph/GRAPH.md` (short) instead of opening many files.
- The graph is a map, not the source of truth: `state.md` and `cell_tree.md` win if they disagree. Rebuild after editing them.
- Re-run dependency chains (Resume §5) with `path`/`explain` on the next cell's `needs`.
