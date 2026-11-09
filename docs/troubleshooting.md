# Troubleshooting

Start with `resbot doctor`. It prints a fix for most problems.

## Installation

**`resbot: command not found` after installing**
Open a new terminal. If it still fails, add the folder to your PATH:
macOS/Linux `export PATH="$HOME/.local/bin:$PATH"` (put it in `~/.zshrc` or `~/.bashrc`);
Windows: add `%LOCALAPPDATA%\resbot\bin` to your user PATH.

**`Claude Code not found`**
Install Claude Code first (https://docs.claude.com/en/docs/claude-code), then run the installer again.

**`Node ... is too old`**
Install Node 18 or newer from https://nodejs.org and run the installer again.

**The one-line installer fails to download**
Check that you can open https://github.com/Bujjinga/Resbot in a browser. Behind a proxy, clone the repo
and run `./install.sh` (or `.\install.ps1`) from inside it.

**PowerShell says running scripts is disabled**
Run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, or start the installer with
`powershell -ExecutionPolicy Bypass -File .\install.ps1`.

**See what the installer would do without changing anything**
`./install.sh --dry-run`, or on Windows `$env:RESBOT_DRY_RUN=1` before the `irm ... | iex` line.

## Browser

**RESBOT says the browser tools are not connected**
Install the Claude in Chrome extension, sign in, and start a session with `claude --chrome`
(or type `/chrome` in a running session).

**It stops at the Kaggle sign-in page**
Sign in yourself in that Chrome window, then tell RESBOT to continue. It never types passwords.

**Code appears in the wrong cell or does not match**
RESBOT checks every insert. If it reports a mismatch, the Kaggle editor may have changed. Delete the
`editor_path`, `insert_method` and `run_method` lines in `config.md` and resume. It will test the editor again.

**It re-runs earlier cells when I resume**
The kernel restarted (Kaggle stops idle sessions), so variables were lost. RESBOT marks cells `stale`
and re-runs only the ones the next cell needs.

## Kaggle CLI

**`kaggle CLI not found`**
`pip install kaggle`. The CLI is optional; everything else works without it.

**`Kaggle API token not found`**
kaggle.com → Settings → API → **Create New Token**. Save the downloaded `kaggle.json` to
`~/.kaggle/kaggle.json` (Windows: `C:\Users\<you>\.kaggle\kaggle.json`). RESBOT only checks that the file
exists; it never reads it aloud or prints it.

## Research

**A paper shows as `UNVERIFIED`**
Its DOI/arXiv id did not come back from a search API, so it is kept out of the report. Run
`resbot paper <arxiv-id or doi>` to fetch real metadata.

**`resbot paper` fails with an HTTP error**
arXiv or Crossref may be rate-limiting you. Wait a minute and try again. `resbot doctor` shows whether they are reachable.

## Removing RESBOT

```bash
resbot uninstall            # keeps ~/.resbot and all workspaces
resbot uninstall --purge    # also removes ~/.resbot
```

Your `resbot-workspace/` folders are never deleted.

## Still stuck

Open an issue at https://github.com/Bujjinga/Resbot/issues with the output of `resbot doctor`
(it never prints tokens) and what you typed.
