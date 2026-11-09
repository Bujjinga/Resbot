# Contributing to RESBOT

RESBOT is created and maintained by **Bujjinga**. Bug reports, ideas and pull requests are welcome.

## Report a bug or ask for a feature

Open an issue at https://github.com/Bujjinga/Resbot/issues and include:

- what you ran (the exact command),
- what you expected and what happened,
- the output of `resbot doctor` (it never prints tokens),
- your OS and Node version.

## Set up a development copy

```bash
git clone https://github.com/Bujjinga/Resbot
cd Resbot
./install.sh          # installs from this folder, so your edits are live
```

There are no dependencies to install.

## Project layout

| Path | What it is |
|---|---|
| `.claude-plugin/marketplace.json` | the `resbot-local` marketplace that lists the plugin |
| `resbot/.claude-plugin/plugin.json` | plugin name, version, description, author |
| `resbot/skills/ch7/SKILL.md` | entry point for `/resbot:ch7`: picks the mode, global rules (keep it under ~120 lines) |
| `resbot/skills/ch7/*.md` | one file per topic: `start`, `loop`, `browser`, `kaggle-cli`, `plot`, `research`, `experiments`, `report`, `graph`, `token-rules` |
| `resbot/skills/ch7/templates/` | starting content for workspace files (`{{slug}}`, `{{url}}`, `{{goal}}`, `{{date}}` are filled in) |
| `bin/resbot.js` | the `resbot` CLI, one file, no dependencies, Node 18+ |
| `install.sh`, `uninstall.sh` | macOS/Linux installers |
| `install.ps1`, `uninstall.ps1` | Windows installers (keep them ASCII-only for Windows PowerShell 5.1) |
| `completions/` | bash, zsh and PowerShell completion scripts |
| `packaging/` | Homebrew formula and Scoop manifest |
| `test/` | `cli.test.js` (node --test), `install.test.sh`, `install.test.ps1` |
| `docs/` | user guides |

## Run the checks

```bash
npm test                         # CLI tests (no network: the paper APIs are mocked)
bash test/install.test.sh        # installer in a temporary HOME with a fake claude command
pwsh test/install.test.ps1       # Windows installer test
claude plugin validate resbot    # plugin manifest and skill
claude plugin validate .         # marketplace
shellcheck install.sh uninstall.sh test/install.test.sh completions/resbot.bash
```

CI runs all of these on Ubuntu, macOS and Windows for every push and pull request. Please make sure
they pass before opening a pull request.

## Guidelines

- Keep the CLI dependency-free.
- One change per pull request, with a test when you add or change behavior.
- Skill files: short, imperative rules; keep token use low (capped output, no full-file reads).
- Safety rules are not optional: the browser acts only on kaggle.com, never types credentials, and
  asks before long runs, pushes, submissions or posting.
- Never invent citations in examples or tests; use real ids or clearly fake mocks.
- Update `CHANGELOG.md` under an "Unreleased" heading.

## Release checklist (maintainer)

1. Bump the version in `package.json`, `resbot/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`.
2. Move the "Unreleased" notes in `CHANGELOG.md` under the new version and date.
3. Run all checks above.
4. Commit, then tag and push: `git tag -a vX.Y.Z -m "RESBOT X.Y.Z" && git push origin main vX.Y.Z`.
5. Create the GitHub release from the tag (the CLI's update check reads the latest release).
6. Optional: `npm publish`; update the SHA-256 values in `packaging/homebrew/resbot.rb` and
   `packaging/scoop/resbot.json` and copy them to the tap/bucket repos.

## License

By contributing you agree that your contribution is released under the [MIT License](LICENSE).
