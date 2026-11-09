# Research (read-only)

No notebook edits in `research` or `paper` mode. Chrome is used only for kaggle.com intel.

## Literature search order

1. **Consensus MCP** (`mcp__claude_ai_Consensus__search`), if connected. Query only, no filters.
2. **Semantic Scholar**: `WebFetch https://api.semanticscholar.org/graph/v1/paper/search?query=<q>&limit=8&fields=title,year,venue,externalIds,abstract,citationCount,url`
3. **arXiv**: `WebFetch http://export.arxiv.org/api/query?search_query=all:<q>&max_results=8`
4. **Crossref**: `WebFetch https://api.crossref.org/works?query=<q>&rows=8` (DOI verification)
5. **WebSearch** as a last resort (blogs, docs, papers-with-code style pages).

Keep the top 5–8 in `notes/literature.md`:
`title | year | venue | DOI/arXiv | method | dataset | metric+number | relevance`

## Citation integrity

- A DOI or arXiv id is VERIFIED only if it appeared in an API response you actually received.
- Anything else is `UNVERIFIED`: keep it in literature.md marked as such and exclude it from the report and references.bib.
- Never invent papers, authors, numbers, or venues. If a number is not in the abstract/response, write `n/a`.

## Kaggle intel (competitions / datasets with a community)

Chrome, kaggle.com only. Read once:
- top 3–5 public notebooks by votes (Code tab, sort by votes)
- top discussions by votes

Write `notes/kaggle_intel.md` (max 30 lines): CV scheme, best single-model score, tricks, known leaks,
each with its URL. Summarize; do not copy code verbatim.

## Output of a research pass

- 2–4 testable hypotheses in `notes/hypotheses.md`: `id | claim | test | expected | status | evidence`
  (status: open/supported/rejected/inconclusive).
- 1–3 ranked ideas in `notes/ideas.md`, paper-inspired ones with their (verified) citation.
- Short chat summary (≤6 lines).

## Paper (`/resbot:ch7 paper <arxiv-id|doi|pdf>`)

1. If `papers/<id>.md` exists, read it instead of the source (never re-read a PDF).
2. arXiv id → arXiv API; DOI → Crossref/Semantic Scholar; PDF path → Read it once (pages in chunks).
3. Write `papers/<id>.md`: problem, method, dataset, metric, key numbers, code link, what's reusable here.
4. Append a BibTeX entry built only from API metadata to `notes/references.bib` (skip if UNVERIFIED).
