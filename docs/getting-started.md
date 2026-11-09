# Getting started

This guide takes you from nothing installed to your first RESBOT session on a Kaggle notebook.
It takes about 10 minutes.

## Step 1: Install the prerequisites

| What | Why | How to check | How to install |
|---|---|---|---|
| Claude Code | RESBOT is a plugin for it | `claude --version` | https://docs.claude.com/en/docs/claude-code |
| Node.js 18 or newer | runs the `resbot` command and installers | `node --version` | https://nodejs.org (or `brew install node`, `winget install OpenJS.NodeJS.LTS`) |
| Google Chrome + the Claude in Chrome extension | RESBOT works inside the Kaggle notebook through your browser | open the extension in Chrome | https://claude.ai/chrome |
| A kaggle.com account | the notebook lives there | sign in at kaggle.com | https://www.kaggle.com/account/login |

Optional, but useful:

| What | Why | How to install |
|---|---|---|
| Python 3.10+ | needed by the Kaggle CLI and graphify | https://www.python.org |
| git | the installer clones with git (falls back to a download without it) | https://git-scm.com |
| Kaggle CLI + API token | fetch notebook snapshots, run outputs and leaderboards without the browser | `pip install kaggle`, then kaggle.com → Settings → API → Create New Token, save the file as `~/.kaggle/kaggle.json` |
| graphify | builds a knowledge graph of your workspace | `resbot graphify` |

## Step 2: Install RESBOT

Pick **one** method.

**macOS / Linux / WSL**

```bash
curl -fsSL https://raw.githubusercontent.com/Bujjinga/Resbot/main/install.sh | bash
```

**Windows (PowerShell)**

```powershell
irm https://raw.githubusercontent.com/Bujjinga/Resbot/main/install.ps1 | iex
```

**npm (any OS)**

```bash
npm i -g resbot-kaggle
resbot install
```

**From a clone**

```bash
git clone https://github.com/Bujjinga/Resbot
cd Resbot
./install.sh          # Windows: .\install.ps1
```

**Without a terminal (plugin only, no `resbot` command)**: type these inside Claude Code:

```
/plugin marketplace add Bujjinga/Resbot
/plugin install resbot@resbot-local
```

Open a **new terminal** afterwards so `resbot` is on your PATH.

## Step 3: Check your setup

```bash
resbot doctor
```

Every line marked `✗` is required and shows a `fix:` line. Lines marked `-` are optional.
Example of a healthy result:

```
✓ Claude Code 2.x
✓ plugin resbot@resbot-local installed
✓ Node 22.x
✓ Python 3.12
✓ git
- kaggle CLI not found (optional)
    fix: pip install kaggle
✓ reach api.semanticscholar.org
✓ reach export.arxiv.org
✓ reach www.kaggle.com
```

## Step 4: Connect the browser

1. Open Chrome and make sure the Claude in Chrome extension is installed and signed in.
2. Sign in to **kaggle.com** in that same Chrome window. RESBOT never types passwords or tokens for you.
3. Start Claude Code with the browser connected: `claude --chrome`, or type `/chrome` inside a running session.

## Step 5: Start your first session

Open (or create) a notebook on Kaggle and copy its URL. Then either:

```bash
resbot open https://www.kaggle.com/code/<your-name>/<notebook> "maximize validation accuracy"
```

or, inside Claude Code:

```
/resbot:ch7 https://www.kaggle.com/code/<your-name>/<notebook> maximize validation accuracy
```

What happens next:

1. RESBOT creates `resbot-workspace/<notebook>/` in your current folder.
2. It opens the notebook in a **new** Chrome tab and checks how the editor works.
3. It reads your existing cells once and builds a map of them (`cell_tree.md`).
4. If you did not give a goal, it asks for one.
5. It does a short literature search and writes 2–4 testable hypotheses.
6. It starts the loop: one cell at a time, with a one-line update in chat after each cell.

It stops and asks you before anything long, costly or public (see [usage.md](usage.md#when-resbot-asks-you-first)).

## Step 6: Come back later

Run the command without arguments in the same folder:

```
/resbot:ch7
```

RESBOT reads its notes, finds (or reopens) the tab, checks whether the kernel restarted, re-runs only
the cells it needs, and continues. To give it a new direction, add text:

```
/resbot:ch7 try a gradient-boosting baseline before the CNN
```

Check progress from any terminal without opening anything:

```bash
resbot status
resbot log
```

## Next

- Every mode explained: [usage.md](usage.md)
- Every `resbot` command: [cli.md](cli.md)
- Something not working: [troubleshooting.md](troubleshooting.md)
