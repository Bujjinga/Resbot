# `resbot` command reference

`resbot` is a small terminal companion. Most commands work on your workspace files directly and
do not need the browser.

Run `resbot help` for a short version of this page.

## Setup

| Command | What it does |
|---|---|
| `resbot install` | registers the plugin (`resbot@resbot-local`), puts `resbot` on your PATH, installs shell completions. Safe to run again. |
| `resbot update` | pulls the latest version and updates the plugin |
| `resbot uninstall` | removes the plugin, the PATH link and completions. Your workspaces are kept. |
| `resbot uninstall --purge` | also deletes `~/.resbot` and the update-check cache |
| `resbot doctor` | checks everything RESBOT needs and prints a fix for each problem |
| `resbot version` | prints the version |

## Starting sessions

These open Claude Code with the browser connected and pass the right command for you.

| Command | Same as typing |
|---|---|
| `resbot open <kaggle-url> [goal]` | `/resbot:ch7 <kaggle-url> [goal]` |
| `resbot research "<question>"` | `/resbot:ch7 research <question>` |
| `resbot report [slug]` | `/resbot:ch7 report` |
| `resbot new <slug>` | creates an empty workspace `resbot-workspace/<slug>` (does not open anything) |

Example:

```bash
resbot open https://www.kaggle.com/code/alice/titanic-eda "beat 0.80 accuracy"
```

## Reading your workspace (no browser needed)

`[slug]` is the workspace folder name. Leave it out to use the most recently active workspace.

| Command | What it shows |
|---|---|
| `resbot status [slug]` | goal, active hypothesis, best result, last and next cell |
| `resbot log [slug]` | the experiments table |
| `resbot ideas [slug]` | ranked next ideas |
| `resbot compare <slug> <exp-a> <exp-b>` | Welch t-test using the mean ± std and seed counts in `experiments.md` |
| `resbot paper <arxiv-id \| doi \| pdf> [--slug s]` | fetches real metadata into `papers/` and adds a BibTeX entry |
| `resbot export [slug]` | writes `<slug>-export.md`: the whole workspace in one readable file |
| `resbot export [slug] --zip` | writes `<slug>.zip` of the workspace |
| `resbot graph build [--slug s]` | builds the workspace knowledge graph: `graph/graph.json` + a short `graph/GRAPH.md` summary |
| `resbot graph query "<question>"` | e.g. `"which cell defines the folds"`: matching nodes and their connections |
| `resbot graph path <A> <B>` | how two things connect, e.g. `resbot graph path E3 H1` |
| `resbot graph explain <X>` | everything about one node, e.g. `cell:07`, `7`, `H2`, `E3` |

Example:

```bash
$ resbot compare titanic-eda E3 E1
E3: 0.842 ± 0.006 (n=3)
E1: 0.801 ± 0.009 (n=3)
Δ (E3 − E1): 0.041
Welch t = 6.565, df = 3.485, p = 0.004454
verdict: significant at 0.05
note: summary-stat Welch test; for a paired test on per-seed scores run /resbot:ch7 compare inside Claude Code.
```

`compare` in the terminal uses summary numbers. For a paired test on per-seed scores, use
`/resbot:ch7 compare` inside a session.

## Kaggle CLI shortcuts

Need the Kaggle CLI and an API token (see [getting-started.md](getting-started.md#step-1-install-the-prerequisites)).

| Command | Runs |
|---|---|
| `resbot pull <owner/kernel>` | `kaggle kernels pull <owner/kernel> -p resbot-workspace/<kernel>/cells/remote -m` |
| `resbot output <owner/kernel>` | `kaggle kernels output <owner/kernel> -p resbot-workspace/<kernel>/outputs/remote` |
| `resbot lb <competition>` | `kaggle competitions leaderboard <competition> -s` |
| `resbot watch <owner/kernel> [--every 5m]` | checks the run status every 5 minutes (`30s`, `10m`, `1h` also work) and rings + shows a notification when it finishes |

## Shell completions

The installer sets these up. To do it by hand:

```bash
resbot completions bash > ~/.local/share/bash-completion/completions/resbot
resbot completions zsh  > ~/.zfunc/_resbot          # and add ~/.zfunc to fpath
resbot completions pwsh >> $PROFILE                  # PowerShell
```

## Environment variables

| Variable | Effect |
|---|---|
| `RESBOT_WORKSPACE` | use a different workspace folder (default `./resbot-workspace`) |
| `RESBOT_NO_UPDATE_CHECK=1` | turn off the once-a-day update check |
| `RESBOT_VERSION=<tag>` | installer: install a specific release, e.g. `v0.1.0` |
| `RESBOT_HOME=<dir>` | installer: where to put RESBOT (default `~/.resbot`) |
| `RESBOT_DRY_RUN=1` | Windows installer: show what would happen without changing anything |

## Exit codes

`0` success, `1` a required check or command failed, `2` wrong usage (bad arguments, unknown workspace).
`resbot graph` also uses `3` (name is ambiguous; candidates are listed) and `4` (nothing matches).
