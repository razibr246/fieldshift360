#!/bin/bash
# Checks what the FS360 agents need, and optionally runs them as a launchd service.
#   install.sh                 check only
#   install.sh always          run 24/7 (forever.sh) as a background service, now and after every login
#   install.sh unschedule      remove either job
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/config.sh"
LABEL=com.fs360.agents
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
ok() { echo "  ✓ $*"; }; bad() { echo "  ✗ $*"; MISSING=1; }
MISSING=0

echo "Checking:"
command -v git >/dev/null && ok "git" || bad "git (xcode-select --install)"
command -v node >/dev/null && ok "node $(node -v)" || bad "node (nvm install 24)"
[ -x "$CHROME" ] && ok "Google Chrome" || bad "Google Chrome at $CHROME (set CHROME in config.sh)"
if [ "$BRAIN" = claude ]; then
  command -v claude >/dev/null && ok "claude $(claude --version 2>/dev/null | head -1)" || bad "Claude Code (curl -fsSL https://claude.ai/install.sh | bash)"
else
  command -v ollama >/dev/null && ok "ollama $(ollama --version 2>/dev/null | grep -o '[0-9.]*$')" || bad "ollama (https://ollama.com/download)"
  for m in "$LOCAL_MODEL" "$EMBED_MODEL"; do
    ollama list 2>/dev/null | grep -q "^$m" && ok "model $m" || bad "model $m (ollama pull $m)"
  done
fi
for a in $AGENTS; do
  load_agent "$a" || { MISSING=1; continue; }
  mkdir -p "$MEMORY" "$SHOTS" "$LOGS" "$D/base"
  for f in "$HERE/memory/$a"/*.md; do [ -f "$MEMORY/$(basename "$f")" ] || cp "$f" "$MEMORY/"; done
  ok "$TITLE: memory in $MEMORY (edit GOALS.md and BACKLOG.md there)"
done

case "${1:-}" in
  always)
    case "$REPO" in "$HOME/Downloads"*|"$HOME/Desktop"*|"$HOME/Documents"*)
      echo; echo "  ! The repo is in a folder macOS protects ($REPO)."
      echo "    A launchd job cannot read it unless you give /bin/bash Full Disk Access"
      echo "    (System Settings → Privacy & Security → Full Disk Access → + → ⇧⌘G /bin/bash),"
      echo "    or you move the repo to e.g. ~/code/fs360, or you use the Terminal method instead (README)." ;;
    esac
    mkdir -p "$HOME/Library/LaunchAgents"
    cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array>
    <string>/usr/bin/caffeinate</string><string>-i</string><string>-s</string>
    <string>/bin/bash</string><string>$HERE/forever.sh</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>$PATH</string></dict>
  <key>StandardOutPath</key><string>$HOME_DIR/launchd.txt</string>
  <key>StandardErrorPath</key><string>$HOME_DIR/launchd.txt</string>
</dict></plist>
EOF
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null
    launchctl bootstrap "gui/$(id -u)" "$PLIST" || exit 1
    ok "running 24/7 as a service, now and after every login; watch it: tail -f $HOME_DIR/launchd.txt" ;;
  unschedule)
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null; rm -f "$PLIST"; ok "24/7 service removed" ;;
esac
[ $MISSING = 0 ] && echo "Ready." || { echo "Install what is marked ✗, then run this again."; exit 1; }
