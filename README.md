# RESBOT

**An agentic Kaggle research partner for Claude Code.** RESBOT drives a kaggle.com notebook one cell
at a time through Claude in Chrome, uses the official Kaggle CLI for headless tasks, and runs
read-only literature research to turn papers and community knowledge into testable experiments.

You type one command:

```
/resbot:ch7 https://www.kaggle.com/code/<owner>/<notebook> "maximize validation AUC"
```

Author and maintainer: **Bujjinga**. License: MIT.

## Documentation

| Guide | For |
|---|---|
| [Getting started](docs/getting-started.md) | first-time setup, step by step, through your first session |
| [Using RESBOT](docs/usage.md) | every `/resbot:ch7` mode, the loop, the workspace files, when it asks you first |
| [CLI reference](docs/cli.md) | every `resbot` command with examples, environment variables, exit codes |
| [Troubleshooting](docs/troubleshooting.md) | common problems and fixes |
| [Contributing](CONTRIBUTING.md) | development setup, tests, project layout, release checklist |
| [Changelog](CHANGELOG.md) | what changed in each version |

---

## What it does

- **One-cell loop.** For every cell: think (what the last output showed, which hypothesis this tests,
  what to expect), write one small cell, insert it, verify the editor text matches, run, wait with
  backoff, read capped output, analyze, record, decide. It never writes cell N+1 before cell N is analyzed.
- **Research discipline.** Hypotheses first, baselines first, one factor per experiment, seeds everywhere,
  ≥3 seeds for key comparisons, mean ± std with significance tests, error analysis after key results.
- **Literature that is real.** Consensus MCP (if connected) → Semantic Scholar → arXiv → Crossref → web search.
  A DOI or arXiv id only counts if it came from a real API response; everything else is marked `UNVERIFIED`
  and kept out of the report.
- **Kaggle intel.** Reads the top public notebooks and discussions once and writes a 30-line summary
  (CV scheme, best single-model score, tricks, known leaks) with links.
- **Token-frugal.** Text before pixels, capped output, summaries instead of dumps, short chat updates.
- **Safe by default.** Chrome acts only on kaggle.com. RESBOT never types passwords or API tokens, never
  posts on Kaggle, and asks before long runs, accelerator or internet changes, adding datasets, Save Version,
  `kaggle kernels push`, submissions, or touching your own cells.

## Requirements

- [Claude Code](https://docs.claude.com/en/docs/claude-code) with the **Claude in Chrome** extension connected
  (`/chrome` inside Claude Code, or start with `claude --chrome`)
- Node.js 18+ (for the `resbot` CLI and installers)
- A kaggle.com account, signed in in that Chrome profile
- Optional: Python 3.10+, `git`, the [Kaggle CLI](https://github.com/Kaggle/kaggle-api) with an API token,
  [graphify](https://github.com/Graphify-Labs/graphify), a Consensus MCP connection

Run `resbot doctor` to check all of it.

## Install

Every method ends with the plugin installed as `resbot@resbot-local` and `resbot` on your PATH.

### 1. One-liner

macOS / Linux / WSL:

```bash
curl -fsSL https://raw.githubusercontent.com/Bujjinga/Resbot/main/install.sh | bash
```

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/Bujjinga/Resbot/main/install.ps1 | iex
```

The installer checks Claude Code and Node 18+, clones (or downloads) RESBOT to `~/.resbot`, runs
`claude plugin marketplace add ~/.resbot` and `claude plugin install resbot@resbot-local`, links `resbot` into
`~/.local/bin` (Windows: `%LOCALAPPDATA%\resbot\bin`), adds it to PATH if needed, installs shell completions,
and prints next steps. Running it again updates in place.

Options:

| Option | Meaning |
|---|---|
| `--dry-run` | print what would happen, change nothing |
| `--uninstall` (`--purge`) | remove everything (with `--purge`, also `~/.resbot`) |
| `RESBOT_VERSION=v0.1.0` | install a specific tag |
| `RESBOT_HOME=<dir>` | install somewhere other than `~/.resbot` |

Pass flags through the pipe with `curl -fsSL .../install.sh | bash -s -- --dry-run`.
With `irm | iex`, use `$env:RESBOT_DRY_RUN=1` instead of flags.

### 2. npm

```bash
npm i -g resbot-kaggle && resbot install
# or without a global install:
npx resbot-kaggle install
```

Installing the package runs nothing by itself; `resbot install` registers the plugin.

### 3. Inside Claude Code (no terminal)

```
/plugin marketplace add Bujjinga/Resbot
/plugin install resbot@resbot-local
```

(This gives you the plugin only; install the CLI with one of the other methods if you want `resbot`.)

### 4. Manual

```bash
git clone https://github.com/Bujjinga/Resbot && cd Resbot && ./install.sh
```

Windows: `.\install.ps1`. A checkout is used in place; `git pull` + `resbot update` keeps it current.

### 5. Homebrew / Scoop

A formula and a manifest live in [`packaging/`](packaging/). They need a tap repo
(`Bujjinga/homebrew-resbot`) and a Scoop bucket to be published, and the release archive's
SHA-256 filled in (commands are in each file). Once published:

```bash
brew tap bujjinga/resbot && brew install resbot && resbot install
scoop bucket add resbot <bucket-url> && scoop install resbot && resbot install
```

## Use it

Inside Claude Code (with Chrome connected):

| Command | What happens |
|---|---|
| `/resbot:ch7 <kaggle-url> [goal]` | **Start**: workspace, new Chrome tab, editor probe, read cells once, cell tree, goal, quick research pass → 2–4 hypotheses → loop |
| `/resbot:ch7` | **Resume**: reads only the state files, finds the tab, checks the kernel, re-runs only the needed chain if it restarted |
| `/resbot:ch7 <free text>` | Resume with a new instruction |
| `/resbot:ch7 research <question>` | Literature + Kaggle community search, no notebook edits |
| `/resbot:ch7 paper <arxiv-id\|doi\|pdf>` | Summary in `papers/<id>.md` (problem, method, dataset, metric, numbers, code, what's reusable) |
| `/resbot:ch7 plot <cell#>` | Analyze a cell's image output (loss curves, confusion matrices, sample grids, Grad-CAM, class balance) |
| `/resbot:ch7 ablate <cell#>` | One-factor-at-a-time ablation of that experiment |
| `/resbot:ch7 compare <exp-a> <exp-b>` | mean ± std, paired t-test or bootstrap CI |
| `/resbot:ch7 report` | `notes/report.md` + `results.csv` + `references.bib` |
| `/resbot:ch7 graph` | Rebuild / query the graphify graph |
| `/resbot:ch7 status` | Goal, active hypothesis, best result ± std, next cell (no browser) |

From a terminal:

```bash
resbot open https://www.kaggle.com/code/<owner>/<notebook> "maximize AUC"   # starts claude --chrome
resbot research "best augmentations for chest x-ray classification"
resbot status            # what's going on, no Claude needed
resbot log               # experiments table
resbot compare <slug> E3 E1
resbot paper 1512.03385  # arXiv/DOI metadata into papers/ + BibTeX
resbot watch <owner>/<kernel> --every 5m   # notify when a committed run finishes
```

## CLI reference

| Command | Description |
|---|---|
| `install` · `update` · `uninstall [--purge]` · `version` · `help` | setup |
| `doctor` | checks Claude Code, the plugin, Node, Python 3.10+, git, graphify, Kaggle CLI + token (never printed), Consensus MCP, network reachability of Semantic Scholar / arXiv / Kaggle |
| `graphify` | installs [graphify](https://github.com/Graphify-Labs/graphify) and runs `graphify install` |
| `new <slug>` | create `resbot-workspace/<slug>` from templates |
| `open <kaggle-url> [goal]` · `research "<q>"` · `report [slug]` | start Claude Code with Chrome and the right `/resbot:ch7` args |
| `paper <arxiv-id\|doi\|pdf> [--slug s]` | fetch metadata into `papers/`, append BibTeX (no Claude needed) |
| `log [slug]` · `ideas [slug]` · `status [slug]` | read the workspace |
| `compare <slug> <exp-a> <exp-b>` | Welch t-test from `experiments.md` |
| `pull <owner/kernel>` · `output <owner/kernel>` · `lb <competition>` | thin Kaggle CLI wrappers |
| `watch <owner/kernel> [--every 5m]` | poll `kaggle kernels status`, bell + OS notification when done |
| `export [slug] [--zip]` | one markdown bundle, or a zip of the workspace |
| `completions <bash\|zsh\|pwsh>` | print a completion script |

`resbot` checks GitHub releases at most once a day and prints `update available: resbot update`.
Disable with `RESBOT_NO_UPDATE_CHECK=1`. Set `RESBOT_WORKSPACE` to use a workspace folder other than
`./resbot-workspace`.

## Workspace

```
resbot-workspace/<slug>/
├── config.md          notebook url, editor path that worked, kaggle CLI yes/no
├── state.md           goal, active hypothesis, best result, next cell
├── cell_tree.md       # | type | purpose | defines | needs | status | key result
├── cells/cell_NN.py   every cell RESBOT wrote
├── outputs/cell_NN.md ≤10-line summary of each output
├── notes/
│   ├── hypotheses.md  literature.md  kaggle_intel.md  dataset_card.md
│   ├── experiments.md ideas.md  report.md
│   └── results.csv    references.bib
└── papers/<id>.md
```

`resbot-workspace/` is git-ignored. Uninstalling never deletes it.

## Kaggle CLI (optional)

When `kaggle --version` works and `~/.kaggle/kaggle.json` (or `KAGGLE_API_TOKEN`) exists, RESBOT can snapshot
the notebook (`kaggle kernels pull`), fetch committed-run outputs without screenshots (`kaggle kernels output`),
and read the leaderboard. It never creates or prints your token, and runs `kaggle kernels push` only after asking.

## Development

```bash
npm test                    # node --test (CLI: new, log, ideas, compare, paper with mocked APIs, export, completions)
bash test/install.test.sh   # installer in a temp HOME with a fake claude shim, then doctor and uninstall
pwsh test/install.test.ps1  # Windows equivalent
claude plugin validate resbot && claude plugin validate .
```

CI runs all of this on Ubuntu, macOS and Windows, plus shellcheck.

Repository layout:

```
.claude-plugin/marketplace.json      marketplace "resbot-local"
resbot/.claude-plugin/plugin.json    plugin "resbot"
resbot/skills/ch7/SKILL.md           orchestrator for /resbot:ch7
resbot/skills/ch7/*.md               start, loop, browser, kaggle-cli, plot, research, experiments, report, graph, token-rules
resbot/skills/ch7/templates/         workspace templates
bin/resbot.js                        CLI (zero dependencies)
install.sh / install.ps1 / uninstall.sh / uninstall.ps1
completions/  packaging/  test/  .github/workflows/ci.yml
```

## Author

RESBOT is created and maintained by [Bujjinga](https://github.com/Bujjinga). See [AUTHORS](AUTHORS).

## License

MIT © 2026 Bujjinga. See [LICENSE](LICENSE).
