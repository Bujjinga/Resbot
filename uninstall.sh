#!/usr/bin/env bash
# RESBOT uninstaller. Flags: --purge (also delete ~/.resbot and the update cache), --dry-run.
# Workspaces (resbot-workspace/) are never touched.
set -euo pipefail
BIN_DIR="${RESBOT_BIN_DIR:-$HOME/.local/bin}"
HOME_DIR="${RESBOT_HOME:-$HOME/.resbot}"
DRY=0; PURGE=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    --purge) PURGE=1 ;;
    *) echo "unknown option: $a" >&2; exit 2 ;;
  esac
done
say() { printf '%s\n' "$*"; }
run() { if [ "$DRY" = 1 ]; then say "+ $*"; else "$@"; fi; }

if command -v claude >/dev/null 2>&1; then
  if claude plugin list --json 2>/dev/null | grep -q '"resbot@resbot-local"'; then run claude plugin uninstall resbot@resbot-local; fi
  if claude plugin marketplace list --json 2>/dev/null | grep -q '"resbot-local"'; then run claude plugin marketplace remove resbot-local; fi
fi
say "✓ plugin and marketplace removed"

# Only remove the link if it is ours.
if [ -L "$BIN_DIR/resbot" ] && readlink "$BIN_DIR/resbot" | grep -q 'resbot.js$'; then run rm -f "$BIN_DIR/resbot"; fi
run rm -f "${XDG_DATA_HOME:-$HOME/.local/share}/bash-completion/completions/resbot" "$HOME/.zfunc/_resbot"
MARK="# added by resbot installer"
for rc in "$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.profile"; do
  if grep -qsF "$MARK" "$rc"; then
    if [ "$DRY" = 1 ]; then say "+ remove resbot lines from $rc"
    else { grep -vF "$MARK" "$rc" || true; } > "$rc.resbot.tmp"; cat "$rc.resbot.tmp" > "$rc"; rm -f "$rc.resbot.tmp"; fi
  fi
done
say "✓ link, completions and PATH lines removed"

if [ "$PURGE" = 1 ]; then
  run rm -rf "$HOME_DIR" "$HOME/.cache/resbot"
  say "✓ purged $HOME_DIR"
fi
say "RESBOT uninstalled. Your resbot-workspace/ folders were kept."
