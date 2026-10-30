#!/bin/bash
# One screen: is the 24/7 loop running, what each agent kept today, and its last few rounds.
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/config.sh"
cd "$REPO" || exit 1
PID=$(cat "$HOME_DIR/forever.pid" 2>/dev/null)
if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then echo "24/7 loop: RUNNING (pid $PID)"; else echo "24/7 loop: not running (start: tools/night-agent/start.sh)"; fi
[ -f "$HOME_DIR/STOP" ] && echo "  stopping after the current round"
[ "$BRAIN" = local ] && echo "brain: $LOCAL_MODEL $(ollama list 2>/dev/null | grep -q "^$LOCAL_MODEL" && echo '(ready)' || echo '(not downloaded yet)')" || echo "brain: Claude ($CLAUDE_MODEL)"
DATE=$(date +%F)
for a in $AGENTS; do
  load_agent "$a" >/dev/null || continue
  BASE=$(cat "$D/base/$DATE" 2>/dev/null)
  echo; echo "== $TITLE"
  [ -n "$BASE" ] && echo "  kept today: $(git rev-list --count "$BASE..$BRANCH_PREFIX/$DATE" 2>/dev/null || echo 0) commit(s) on $BRANCH_PREFIX/$DATE"
  [ -d "$D/lock" ] && echo "  working now"
  grep -h "runner:" "$MEMORY/LOG.md" 2>/dev/null | tail -4 | sed 's/^/  /'
  echo "  next task: $(sed -n '/^- /{s/^- //p;q;}' "$MEMORY/BACKLOG.md" 2>/dev/null | cut -c1-110)"
done
