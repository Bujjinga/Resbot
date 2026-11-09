# Kaggle CLI (optional headless path)

Use only when BOTH hold:
- `kaggle --version` works, and
- a credential exists: `~/.kaggle/kaggle.json` (check existence only, e.g. `python3 -c "import os;print(os.path.exists(os.path.expanduser('~/.kaggle/kaggle.json')))"`)
  or the `KAGGLE_API_TOKEN` / `KAGGLE_USERNAME`+`KAGGLE_KEY` environment variables are set.

**Never create, read aloud, print, or copy the token.** If missing, tell the user how to create it
(kaggle.com → Settings → API → Create New Token) and continue with Chrome only.
Record `kaggle: yes/no` in `config.md`.

## Commands

| Need | Command |
|---|---|
| Snapshot notebook + metadata | `kaggle kernels pull <owner/slug> -p resbot-workspace/<slug>/cells/remote -m` |
| Status of a committed run | `kaggle kernels status <owner/slug>` |
| Outputs of a committed run (no screenshots) | `kaggle kernels output <owner/slug> -p resbot-workspace/<slug>/outputs/remote` |
| Leaderboard context | `kaggle competitions leaderboard <comp> -s` |
| Dataset files | `kaggle datasets files <owner/dataset>` |

Read downloaded logs/CSVs with the same caps as [token-rules.md](token-rules.md) (head/tail, never whole files).

## Push

`kaggle kernels push` creates a NEW version. Run it ONLY after the user explicitly says yes.
