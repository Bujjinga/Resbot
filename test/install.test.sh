#!/usr/bin/env bash
# Installer test: temp HOME + fake `claude` shim. Runs install.sh, doctor, idempotent reinstall, uninstall.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
export HOME="$T/home" SHELL=/bin/bash RESBOT_NO_UPDATE_CHECK=1 RESBOT_DOCTOR_OFFLINE=1
mkdir -p "$HOME" "$T/fakebin"
LOG="$T/claude.log"

# Fake claude: records calls and keeps marketplace/plugin state in files.
cat > "$T/fakebin/claude" <<SHIM
#!/usr/bin/env bash
echo "\$*" >> "$LOG"
S="$T/state"; mkdir -p "\$S"
case "\$*" in
  --version) echo "9.9.9 (Claude Code)";;
  "plugin marketplace list --json") [ -f "\$S/mk" ] && echo '[{"name":"resbot-local"}]' || echo '[]';;
  "plugin list --json") [ -f "\$S/pl" ] && echo '[{"id":"resbot@resbot-local"}]' || echo '[]';;
  "plugin marketplace add "*) touch "\$S/mk";;
  "plugin install resbot@resbot-local") [ -f "\$S/mk" ] || exit 1; touch "\$S/pl";;
  "plugin uninstall resbot@resbot-local") rm -f "\$S/pl";;
  "plugin marketplace remove resbot-local") rm -f "\$S/mk";;
  "mcp list") echo "claude.ai Consensus: connected";;
esac
exit 0
SHIM
chmod +x "$T/fakebin/claude"
export PATH="$T/fakebin:$PATH"

ok() { printf '  ✓ %s\n' "$1"; }
die() { printf '  ✗ %s\n' "$1"; cat "$LOG" 2>/dev/null; exit 1; }

echo "dry run"
bash "$ROOT/install.sh" --dry-run > "$T/dry.out"
grep -q '+ claude plugin marketplace add' "$T/dry.out" || die "dry run should print the add command"
[ ! -e "$HOME/.local/bin/resbot" ] || die "dry run must not link"
[ ! -f "$T/state/mk" ] || die "dry run must not add the marketplace"
ok "dry run changes nothing"

echo "install"
bash "$ROOT/install.sh" > "$T/install.out"
grep -q "plugin marketplace add $ROOT" "$LOG" || die "marketplace add not called with the checkout"
grep -q "plugin install resbot@resbot-local" "$LOG" || die "plugin install not called"
[ -L "$HOME/.local/bin/resbot" ] || die "resbot not linked"
[ -f "$HOME/.local/share/bash-completion/completions/resbot" ] || die "bash completion missing"
[ -f "$HOME/.zfunc/_resbot" ] || die "zsh completion missing"
grep -q "added by resbot installer" "$HOME/.bashrc" || die "PATH not added to .bashrc"
ok "installed, linked, completions, PATH"

echo "resbot on PATH"
export PATH="$HOME/.local/bin:$PATH"
[ "$(resbot version)" = "$(node -p "require('$ROOT/package.json').version")" ] || die "resbot version mismatch"
ok "resbot version"

echo "doctor"
resbot doctor > "$T/doctor.out" || die "doctor failed: $(cat "$T/doctor.out")"
grep -q "✓ plugin resbot@resbot-local installed" "$T/doctor.out" || die "doctor should see the plugin"
grep -q "✓ Consensus MCP" "$T/doctor.out" || die "doctor should see Consensus"
ok "doctor passes"

echo "idempotent reinstall"
bash "$ROOT/install.sh" > /dev/null
grep -q "plugin update resbot@resbot-local" "$LOG" || die "reinstall should update, not reinstall"
[ "$(grep -c 'added by resbot installer' "$HOME/.bashrc")" = 1 ] || die "PATH line duplicated"
ok "second run updates in place"

echo "uninstall"
resbot uninstall --purge > /dev/null
[ ! -e "$HOME/.local/bin/resbot" ] || die "link not removed"
[ ! -f "$HOME/.zfunc/_resbot" ] || die "zsh completion not removed"
! grep -qs "added by resbot installer" "$HOME/.bashrc" || die "PATH line not removed"
[ ! -f "$T/state/pl" ] && [ ! -f "$T/state/mk" ] || die "plugin/marketplace not removed"
[ -f "$ROOT/install.sh" ] || die "uninstall must not touch the checkout"
ok "uninstall removes everything"

echo "missing claude"
PATH="/usr/bin:/bin" HOME="$T/home2" bash "$ROOT/install.sh" > "$T/noclaude.out" 2>&1 && die "should fail without claude"
grep -q "fix:" "$T/noclaude.out" || die "should print a fix"
ok "fails with a fix when claude is missing"
echo "ALL INSTALLER TESTS PASSED"
