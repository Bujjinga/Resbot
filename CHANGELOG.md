# Changelog

All notable changes to RESBOT are documented here. Maintainer: Bujjinga.

## [Unreleased]

### Added
- User guides in `docs/` (getting started, usage, CLI reference, troubleshooting), `CONTRIBUTING.md`, `AUTHORS`, `CODEOWNERS`.

## [0.1.0] - 2026-11-09

### Added
- `resbot` Claude Code plugin with the `/resbot:ch7` skill: start/resume a Kaggle notebook session,
  one-cell loop (think, write, insert, verify, run, read, analyze, record, decide), and the
  `research`, `paper`, `plot`, `ablate`, `compare`, `report`, `graph` and `status` modes.
- Editor probing for the Kaggle notebook editor (main DOM, iframe, keyboard/clipboard paths).
- Optional Kaggle CLI path (pull, status, output, leaderboard; push only after asking).
- Research workflow: hypotheses, verified-only citations, Kaggle intel, experiments log,
  reproducibility rules, error analysis, report with `results.csv` and `references.bib`.
- Zero-dependency `resbot` CLI: install, update, uninstall, doctor, graphify, new, open, research,
  report, paper, log, ideas, status, compare, pull, output, lb, watch, export, completions,
  daily update check.
- Installers: `install.sh`, `install.ps1`, `uninstall.sh`, `uninstall.ps1`, with `--dry-run`,
  `--uninstall`, `RESBOT_VERSION`, `RESBOT_HOME`.
- Shell completions for bash, zsh and PowerShell.
- Homebrew formula and Scoop manifest templates.
- Tests (`node --test`, bash and PowerShell installer tests) and CI on Ubuntu, macOS and Windows.
