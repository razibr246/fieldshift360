#!/bin/bash
# Starts the 24/7 loop, detached: it keeps running after this Terminal or editor closes, until stop.sh or a restart.
#   start.sh            in the background, log in ~/fs360-night/forever.log (follow it: tail -f ~/fs360-night/forever.log)
#   start.sh window     in its own Terminal window instead (closing the window stops it)
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/config.sh"
PID=$(cat "$HOME_DIR/forever.pid" 2>/dev/null)
if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then echo "already running (pid $PID)"; exit 0; fi
mkdir -p "$HOME_DIR"; rm -f "$HOME_DIR/STOP"
if [ "${1:-}" = window ]; then
  osascript -e "tell application \"Terminal\" to do script \"cd '$REPO' && caffeinate -dimsu '$HERE/forever.sh'\"" -e 'tell application "Terminal" to activate' >/dev/null \
    && { echo "started in a new Terminal window"; exit 0; }
  echo "Terminal did not answer (allow it in System Settings → Privacy & Security → Automation); starting in the background"
fi
cd "$REPO" && nohup perl -e 'use POSIX; setsid(); exec @ARGV' caffeinate -dimsu /bin/bash "$HERE/forever.sh" >> "$HOME_DIR/forever.log" 2>&1 < /dev/null &
sleep 2
echo "started in the background (pid $(cat "$HOME_DIR/forever.pid" 2>/dev/null))."
echo "  watch:  tail -f ~/fs360-night/forever.log      status: tools/night-agent/status.sh      stop: tools/night-agent/stop.sh"
