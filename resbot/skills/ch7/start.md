# Start and Resume

## Start (`/resbot:ch7 <kaggle-url> [goal]`)

1. **Validate the URL.** Must be `https://www.kaggle.com/...` (code/edit, kernels, or a notebook page).
   Slug = last meaningful path segment (e.g. `.../code/alice/titanic-eda` → `titanic-eda`).
2. **Workspace.** `mkdir -p resbot-workspace/<slug>/{cells,outputs,notes,papers}`. Copy templates:
   `state.md`, `cell_tree.md`, `notes/hypotheses.md`, `notes/literature.md`, `notes/experiments.md`.
   Write `config.md` with: url, slug, created date, goal (or `TBD`), editor path (`TBD`), kaggle CLI (`TBD`).
3. **Chrome.** Load all Chrome tools in ONE ToolSearch call. Get the tab context, then open the URL
   in a **new tab** (never hijack the user's tabs). If a sign-in page appears, ask the user to sign in.
   If the URL is a viewer page, use the "Edit"/"Copy & Edit" button only after asking (Copy & Edit creates a fork).
4. **Probe the editor** with [browser.md](browser.md) §Probe. Save the working path to `config.md`.
5. **Read existing cells once** (one JS call returning source previews + output summaries, capped).
   Build `cell_tree.md`: one row per cell, status `user` for cells you did not write.
   Infer `defines` (top-level names, imports) and `needs` (names used but defined in earlier cells).
6. **Goal.** If missing, ask one question: "What's the goal (metric + target, or the question to answer)?"
7. **Kaggle CLI check** per [kaggle-cli.md](kaggle-cli.md) (records `kaggle: yes/no` in `config.md`).
8. **Quick research pass** ([research.md](research.md), budget: ≤3 searches + Kaggle intel if a competition).
   Write 2–4 testable hypotheses into `notes/hypotheses.md` (H1..H4), baselines first.
9. Write `state.md` (goal, active hypothesis, next cell plan) and enter [loop.md](loop.md).

## Resume (empty `$ARGUMENTS` or free text)

1. Pick the workspace: the only folder in `resbot-workspace/`, else the most recently modified `state.md`.
   If none exists, ask for a Kaggle URL.
2. Read ONLY: `state.md`, `cell_tree.md`, `config.md`, and the top 20 lines of `notes/hypotheses.md`.
3. Free text = a new instruction from the user: record it in `state.md` under "Instructions" and follow it.
4. Find the tab whose URL contains the slug; if none, open `config.md` url in a new tab.
5. **Kernel check** (one JS call): kernel status text + whether cells show execution counts.
   If the kernel restarted (no counts / "Session not started" / idle with empty outputs):
   mark every `ok` cell `stale` in `cell_tree.md`, then re-run only the dependency chain the next cell
   `needs` (walk `needs` → `defines` backwards; run those cells in order; skip pure plotting/EDA cells).
6. Continue the loop at `state.md` → "Next cell".
