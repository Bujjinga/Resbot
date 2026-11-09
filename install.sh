#!/usr/bin/env bash
# RESBOT installer: macOS / Linux / WSL.
#   curl -fsSL https://raw.githubusercontent.com/Bujjinga/Resbot/main/install.sh | bash
# Flags: --dry-run, --uninstall [--purge]. Env: RESBOT_VERSION=<tag>, RESBOT_HOME=<dir>.
set -euo pipefail

REPO="Bujjinga/Resbot"
REF="${RESBOT_VERSION:-main}"
BIN_DIR="${RESBOT_BIN_DIR:-$HOME/.local/bin}"
DRY=0
UNINSTALL=0
PASS=()
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1; PASS+=("$a") ;;
    --uninstall) UNINSTALL=1 ;;
    --purge) PASS+=("$a") ;;
    -h|--help) sed -n '2,5p' "$0" 2>/dev/null || true; exit 0 ;;
    *) echo "unknown option: $a" >&2; exit 2 ;;
  esac
done

say() { printf '%s\n' "$*"; }
run() { if [ "$DRY" = 1 ]; then say "+ $*"; else "$@"; fi; }
fail() { say "✗ $1"; [ -n "${2:-}" ] && say "  fix: $2"; exit 1; }

# Running from a checkout (manual install or `resbot install`)? Use it in place.
SCRIPT_DIR=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

if [ "$UNINSTALL" = 1 ]; then
  for u in ${SCRIPT_DIR:+"$SCRIPT_DIR/uninstall.sh"} "${RESBOT_HOME:-$HOME/.resbot}/uninstall.sh"; do
    if [ -f "$u" ]; then exec bash "$u" ${PASS[@]+"${PASS[@]}"}; fi
  done
  curl -fsSL "https://raw.githubusercontent.com/$REPO/$REF/uninstall.sh" | bash -s -- ${PASS[@]+"${PASS[@]}"}
  exit $?
fi

# 1. Prerequisites
command -v claude >/dev/null 2>&1 || fail "Claude Code not found" "install Claude Code (https://docs.claude.com/en/docs/claude-code), then rerun this installer"
say "✓ Claude Code $(claude --version 2>/dev/null | head -n1)"
command -v node >/dev/null 2>&1 || fail "Node.js not found" "install Node 18+ (https://nodejs.org, or: brew install node / nvm install 20)"
node -e 'process.exit(+process.versions.node.split(".")[0] >= 18 ? 0 : 1)' || fail "Node $(node --version) is too old" "install Node 18+ (https://nodejs.org)"
say "✓ Node $(node --version)"

# 2. Source
if [ -n "$SCRIPT_DIR" ] && [ -f "$SCRIPT_DIR/.claude-plugin/marketplace.json" ] && [ -z "${RESBOT_HOME:-}" ]; then
  SRC="$SCRIPT_DIR"
  say "✓ using checkout $SRC"
else
  SRC="${RESBOT_HOME:-$HOME/.resbot}"
  if command -v git >/dev/null 2>&1; then
    if [ -d "$SRC/.git" ]; then
      say "• updating $SRC ($REF)"
      run git -C "$SRC" fetch --quiet --tags origin
      run git -C "$SRC" checkout --quiet "$REF"
      if [ "$REF" = main ]; then run git -C "$SRC" pull --quiet --ff-only origin main; fi
    else
      say "• cloning $REPO ($REF) into $SRC"
      run git clone --quiet --depth 1 --branch "$REF" "https://github.com/$REPO.git" "$SRC"
    fi
  else
    say "• git not found; downloading tarball ($REF) into $SRC"
    run mkdir -p "$SRC"
    if [ "$DRY" = 1 ]; then say "+ curl https://codeload.github.com/$REPO/tar.gz/$REF | tar xz -C $SRC"
    else curl -fsSL "https://codeload.github.com/$REPO/tar.gz/$REF" | tar xz --strip-components=1 -C "$SRC"; fi
  fi
fi

# 3. Plugin (idempotent: update when already present)
if claude plugin marketplace list --json 2>/dev/null | grep -q '"resbot-local"'; then
  run claude plugin marketplace update resbot-local
else
  run claude plugin marketplace add "$SRC"
fi
if claude plugin list --json 2>/dev/null | grep -q '"resbot@resbot-local"'; then
  run claude plugin update resbot@resbot-local
else
  run claude plugin install resbot@resbot-local
fi

# 4. resbot on PATH
run mkdir -p "$BIN_DIR"
run chmod +x "$SRC/bin/resbot.js"
run ln -sf "$SRC/bin/resbot.js" "$BIN_DIR/resbot"
say "✓ linked $BIN_DIR/resbot"

MARK="# added by resbot installer"
case "$(basename "${SHELL:-sh}")" in
  zsh) RC="$HOME/.zshrc" ;;
  bash) RC="$HOME/.bashrc" ;;
  *) RC="$HOME/.profile" ;;
esac
add_rc() { # add_rc <line>
  if ! grep -qsF "$1 $MARK" "$RC"; then
    if [ "$DRY" = 1 ]; then say "+ echo '$1 $MARK' >> $RC"; else printf '%s %s\n' "$1" "$MARK" >> "$RC"; fi
  fi
}
case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) add_rc "export PATH=\"$BIN_DIR:\$PATH\""; say "✓ added $BIN_DIR to PATH in $RC (open a new shell)" ;;
esac

# 5. Completions
BASH_C="${XDG_DATA_HOME:-$HOME/.local/share}/bash-completion/completions"
run mkdir -p "$BASH_C" "$HOME/.zfunc"
run cp "$SRC/completions/resbot.bash" "$BASH_C/resbot"
run cp "$SRC/completions/_resbot" "$HOME/.zfunc/_resbot"
if [ "$(basename "${SHELL:-sh}")" = zsh ]; then
  # Literal $fpath must land in .zshrc unexpanded.
  # shellcheck disable=SC2016
  add_rc 'fpath=(~/.zfunc $fpath); autoload -Uz compinit && compinit'
fi
say "✓ shell completions installed"

# 6. Next steps
cat <<MSG

RESBOT installed ($([ "$DRY" = 1 ] && echo "dry run" || echo "resbot@resbot-local")).
Next:
  1. resbot doctor                       # check everything
  2. Install + connect Claude in Chrome  # https://claude.ai/chrome, then /chrome in Claude Code
  3. Sign in to kaggle.com in Chrome yourself
  4. resbot open <kaggle-notebook-url> "<goal>"
     or inside Claude Code: /resbot:ch7 <kaggle-notebook-url> <goal>
MSG
