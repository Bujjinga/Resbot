# RESBOT

**An agentic Kaggle research partner.** RESBOT works inside your Kaggle notebook one cell at a time,
reads papers and community notebooks to decide what to try next, and keeps a clean, reproducible
record of every experiment.

You type one command:

```
/resbot:ch7 https://www.kaggle.com/code/<owner>/<notebook> maximize validation AUC
```

Created and maintained by **[Bujjinga](https://github.com/Bujjinga)** · MIT License · [Latest release](https://github.com/Bujjinga/Resbot/releases/latest)

---

## Contents

- [What it does](#what-it-does)
- [Requirements](#requirements)
- [Install on macOS](#install-on-macos)
- [Install on Linux](#install-on-linux)
- [Install on Windows](#install-on-windows)
- [Other ways to install](#other-ways-to-install)
- [Check your setup](#check-your-setup)
- [Quick start](#quick-start)
- [Session commands](#session-commands)
- [Terminal commands](#terminal-commands)
- [The workspace](#the-workspace)
- [Knowledge graph](#knowledge-graph)
- [Safety](#safety)
- [Update](#update)
- [Uninstall](#uninstall)
- [Releases](#releases)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Author and license](#author-and-license)

---

## What it does

| | |
|---|---|
| **One cell at a time** | For every cell it thinks (what the last output showed, what this cell tests, what to expect), writes one small cell, checks it landed correctly, runs it, reads a short part of the output, analyzes it and records the result. It never writes the next cell before the current one is understood. |
| **Real research discipline** | Hypotheses first, baselines first, one change per experiment, fixed seeds, at least 3 seeds for key comparisons, mean ± std with significance tests, error analysis after key results. |
| **Citations you can trust** | Searches Consensus, Semantic Scholar, arXiv and Crossref. A paper only counts if its DOI or arXiv id came back from a real API; everything else is marked `UNVERIFIED` and kept out of the report. |
| **Kaggle community intel** | Reads the top public notebooks and discussions once and writes a 30-line summary: CV scheme, best single-model score, tricks, known leaks, with links. |
| **Knowledge graph** | A built-in map of which cell needs which, which experiment tests which hypothesis, and which paper inspired what. |
| **Light on tokens** | Text before screenshots, capped output, summaries instead of dumps, one-line chat updates. |
| **Safe by default** | The browser acts only on kaggle.com. It never types passwords or tokens, never posts on Kaggle, and asks before anything long, costly or public. |

## Requirements

| Required | Check | Get it |
|---|---|---|
| Claude Code | `claude --version` | https://docs.claude.com/en/docs/claude-code |
| Node.js 18 or newer | `node --version` | see your OS section below |
| Google Chrome with the Claude in Chrome extension | open the extension | https://claude.ai/chrome |
| A kaggle.com account | sign in | https://www.kaggle.com |

| Optional | Used for |
|---|---|
| Python 3.10+ | the Kaggle CLI |
| git | faster installs and updates (a download is used without it) |
| Kaggle CLI + API token | notebook snapshots, run outputs and leaderboards without the browser |
| Consensus connection | an extra paper search source |

---

## Install on macOS

**1. Install Node.js** (skip if `node --version` shows 18 or newer)

```bash
brew install node
```

No Homebrew? Download the installer from https://nodejs.org.

**2. Install RESBOT**

```bash
curl -fsSL https://raw.githubusercontent.com/Bujjinga/Resbot/main/install.sh | bash
```

**3. Open a new terminal** and check it worked:

```bash
resbot doctor
```

What the installer puts on your Mac:

| Item | Location |
|---|---|
| RESBOT files | `~/.resbot` |
| `resbot` command | `~/.local/bin/resbot` (added to your PATH in `~/.zshrc` if needed) |
| zsh completion | `~/.zfunc/_resbot` |
| bash completion | `~/.local/share/bash-completion/completions/resbot` |

Prefer to install from a clone?

```bash
git clone https://github.com/Bujjinga/Resbot
cd Resbot
./install.sh
```

## Install on Linux

Works on Ubuntu, Debian, Fedora, Arch and WSL.

**1. Install Node.js 18+** (skip if `node --version` shows 18 or newer)

```bash
# Ubuntu / Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs
# Fedora
sudo dnf install -y nodejs
# Arch
sudo pacman -S nodejs npm
```

Or use a version manager such as nvm: `nvm install 22`.

**2. Install RESBOT**

```bash
curl -fsSL https://raw.githubusercontent.com/Bujjinga/Resbot/main/install.sh | bash
```

**3. Open a new terminal** and check it worked:

```bash
resbot doctor
```

What the installer puts on your system:

| Item | Location |
|---|---|
| RESBOT files | `~/.resbot` |
| `resbot` command | `~/.local/bin/resbot` (added to your PATH in `~/.bashrc` or `~/.profile` if needed) |
| bash completion | `~/.local/share/bash-completion/completions/resbot` |
| zsh completion | `~/.zfunc/_resbot` |

From a clone:

```bash
git clone https://github.com/Bujjinga/Resbot
cd Resbot
./install.sh
```

## Install on Windows

Use **PowerShell** (Windows PowerShell 5.1 or PowerShell 7).

**1. Install Node.js** (skip if `node --version` shows 18 or newer)

```powershell
winget install OpenJS.NodeJS.LTS
```

Or download the installer from https://nodejs.org.

**2. Install RESBOT**

```powershell
irm https://raw.githubusercontent.com/Bujjinga/Resbot/main/install.ps1 | iex
```

If PowerShell says running scripts is disabled, run this once and try again:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**3. Open a new PowerShell window** and check it worked:

```powershell
resbot doctor
```

What the installer puts on your PC:

| Item | Location |
|---|---|
| RESBOT files | `%USERPROFILE%\.resbot` |
| `resbot` command | `%LOCALAPPDATA%\resbot\bin\resbot.cmd` (added to your user PATH) |
| PowerShell completion | loaded from your PowerShell profile |

From a clone:

```powershell
git clone https://github.com/Bujjinga/Resbot
cd Resbot
.\install.ps1
```

## Other ways to install

### npm (any OS)

```bash
npm i -g resbot-kaggle
resbot install
```

Or without a global install: `npx resbot-kaggle install`. Installing the package runs nothing by itself;
`resbot install` does the setup.

### From inside Claude Code (no terminal)

```
/plugin marketplace add Bujjinga/Resbot
/plugin install resbot@resbot-local
```

This adds the `/resbot:ch7` command only. Use one of the OS installs above if you also want the `resbot` terminal command.

### Homebrew and Scoop

A Homebrew formula and a Scoop manifest are ready in [`packaging/`](packaging/). They will work once the
tap (`Bujjinga/homebrew-resbot`) and bucket are published:

```bash
brew tap bujjinga/resbot && brew install resbot && resbot install                # macOS / Linux
scoop bucket add resbot <bucket-url> && scoop install resbot && resbot install   # Windows
```

### Installer options

| macOS / Linux | Windows | Effect |
|---|---|---|
| `--dry-run` | `$env:RESBOT_DRY_RUN=1` | show what would happen, change nothing |
| `--uninstall` | `.\install.ps1 --uninstall` | remove RESBOT |
| `RESBOT_VERSION=v0.2.0` | `$env:RESBOT_VERSION="v0.2.0"` | install a specific release |
| `RESBOT_HOME=<dir>` | `$env:RESBOT_HOME="<dir>"` | install somewhere other than `~/.resbot` |

Using them with the one-liner (macOS / Linux):

```bash
curl -fsSL https://raw.githubusercontent.com/Bujjinga/Resbot/main/install.sh | bash -s -- --dry-run
curl -fsSL https://raw.githubusercontent.com/Bujjinga/Resbot/main/install.sh | RESBOT_VERSION=v0.2.0 bash
```

Windows: set the variable first, then run the `irm ... | iex` line in the same window.

Running the installer again is safe: it updates what is already there.

---

## Check your setup

```bash
resbot doctor
```

`✓` means ready, `✗` is required and comes with a `fix:` line, `-` is optional. It checks Claude Code,
the plugin, Node, Python, git, the Kaggle CLI and token (the token is never printed), the Consensus
connection, and whether Semantic Scholar, arXiv and Kaggle are reachable.

## Quick start

1. Open Chrome, make sure the Claude in Chrome extension is connected, and **sign in to kaggle.com yourself**.
2. Start a session on a notebook:

   ```bash
   resbot open https://www.kaggle.com/code/<owner>/<notebook> "maximize validation AUC"
   ```

   or, inside Claude Code (started with `claude --chrome`, or after typing `/chrome`):

   ```
   /resbot:ch7 https://www.kaggle.com/code/<owner>/<notebook> maximize validation AUC
   ```

3. RESBOT opens the notebook in a new tab, maps your existing cells, writes 2–4 hypotheses and starts working.
4. Come back later with `/resbot:ch7` (no arguments) and it continues where it stopped.

Full walkthrough: [docs/getting-started.md](docs/getting-started.md).

## Session commands

Typed inside Claude Code:

| Command | What happens |
|---|---|
| `/resbot:ch7 <kaggle-url> [goal]` | **Start** a session on a notebook |
| `/resbot:ch7` | **Resume**: continues, re-running only the cells it needs if the kernel restarted |
| `/resbot:ch7 <instruction>` | Resume with a new instruction, e.g. `try a boosting baseline first` |
| `/resbot:ch7 research <question>` | Paper and Kaggle community search, no notebook edits |
| `/resbot:ch7 paper <arxiv-id \| doi \| pdf>` | Summarize one paper into `papers/` |
| `/resbot:ch7 plot <cell#>` | Analyze a plot (loss curves, confusion matrix, sample grids, Grad-CAM, class balance) |
| `/resbot:ch7 ablate <cell#>` | Remove one component at a time to see what matters |
| `/resbot:ch7 compare <exp-a> <exp-b>` | mean ± std, paired t-test or bootstrap CI |
| `/resbot:ch7 report` | Write the report, `results.csv` and `references.bib` |
| `/resbot:ch7 graph` | Build and query the workspace knowledge graph |
| `/resbot:ch7 status` | Goal, active hypothesis, best result, next cell |

Details for each: [docs/usage.md](docs/usage.md).

## Terminal commands

| Command | What it does |
|---|---|
| `resbot doctor` | check your setup |
| `resbot open <kaggle-url> [goal]` | start a session |
| `resbot research "<question>"` | start a research-only session |
| `resbot status` · `resbot log` · `resbot ideas` | read progress without opening anything |
| `resbot compare <slug> <exp-a> <exp-b>` | significance test from your experiments table |
| `resbot paper <arxiv-id \| doi \| pdf>` | fetch real metadata and BibTeX |
| `resbot graph build \| query \| path \| explain` | the workspace knowledge graph |
| `resbot export [--zip]` | the whole workspace as one file or a zip |
| `resbot pull` · `output` · `lb` · `watch` | Kaggle CLI shortcuts (watch notifies you when a run finishes) |
| `resbot new <slug>` · `report [slug]` | create a workspace · write the report |
| `resbot install` · `update` · `uninstall` · `version` · `help` | setup |

Every command with examples: [docs/cli.md](docs/cli.md).

## The workspace

Everything is saved as plain text in `resbot-workspace/<notebook>/` in the folder you start from:

```
resbot-workspace/<notebook>/
├── config.md          notebook URL and how the editor was driven
├── state.md           goal, active hypothesis, best result, next step
├── cell_tree.md       one row per cell: purpose, what it defines and needs, status, key result
├── cells/             the exact code of every cell RESBOT wrote
├── outputs/           a short summary of every output
├── notes/             hypotheses, experiments, literature, Kaggle intel, dataset card, ideas,
│                      report, results.csv, references.bib
├── papers/            one summary per paper
└── graph/             the knowledge graph (graph.json + GRAPH.md)
```

Uninstalling never deletes it.

## Knowledge graph

RESBOT builds its own graph of the workspace, with nothing extra to install:

```bash
resbot graph build
resbot graph query "which cell defines the folds"
resbot graph path E3 H1
resbot graph explain cell:07
```

It links cells to the cells they depend on, experiments to the cells they ran in and the hypotheses
they test, and notes to the papers they cite. A short summary is written to `graph/GRAPH.md`.

## Safety

RESBOT always asks you before:

- training or multi-seed runs longer than 15 minutes
- changing the accelerator, turning internet on or off, adding datasets
- Save Version, `kaggle kernels push`, or any competition submission
- editing or deleting cells you wrote
- posting anything on Kaggle (it never does this on its own)
- a fourth fix attempt on a failing cell

It never types passwords or API tokens, and the browser only acts on kaggle.com.

---

## Update

**macOS / Linux / Windows**

```bash
resbot update
```

Or run the install one-liner for your OS again. With npm: `npm i -g resbot-kaggle@latest && resbot install`.
RESBOT checks for a new release at most once a day and tells you when one is out
(turn this off with `RESBOT_NO_UPDATE_CHECK=1`).

## Uninstall

**macOS / Linux**

```bash
resbot uninstall            # keeps ~/.resbot
resbot uninstall --purge    # also deletes ~/.resbot
```

Without the `resbot` command: `curl -fsSL https://raw.githubusercontent.com/Bujjinga/Resbot/main/uninstall.sh | bash`

**Windows**

```powershell
resbot uninstall            # keeps %USERPROFILE%\.resbot
resbot uninstall --purge    # also deletes it
```

Your `resbot-workspace/` folders are always kept.

## Releases

- All versions and their notes: [GitHub Releases](https://github.com/Bujjinga/Resbot/releases)
- What changed in each version: [CHANGELOG.md](CHANGELOG.md)
- Install a specific version: set `RESBOT_VERSION`, see [Installer options](#installer-options)

## Documentation

| Guide | For |
|---|---|
| [Getting started](docs/getting-started.md) | first-time setup through your first session |
| [Using RESBOT](docs/usage.md) | every session command, the loop, the workspace files |
| [CLI reference](docs/cli.md) | every terminal command with examples |
| [Troubleshooting](docs/troubleshooting.md) | common problems and fixes |
| [Contributing](CONTRIBUTING.md) | development setup, tests, project layout, releases |

## Contributing

Bug reports and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). Quick checks:

```bash
npm test                     # CLI and graph tests
bash test/install.test.sh    # installer test (macOS / Linux)
pwsh test/install.test.ps1   # installer test (Windows)
```

## Author and license

RESBOT is created and maintained by **[Bujjinga](https://github.com/Bujjinga)** ([AUTHORS](AUTHORS)).

Released under the [MIT License](LICENSE). Copyright © 2026 Bujjinga.
