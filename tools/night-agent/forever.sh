#!/bin/bash
# The 24/7 loop: one round of each agent in turn (game, project, game, …), for ever.
# Taking turns keeps one model in RAM and one dev server and Chrome running at a time.
#   caffeinate -dimsu tools/night-agent/forever.sh     (start.sh opens it in its own Terminal window)
# Stop: touch ~/fs360-night/STOP (it finishes the round it is in)
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/config.sh"
mkdir -p "$HOME_DIR"
OLD=$(cat "$HOME_DIR/forever.pid" 2>/dev/null)
if [ -n "$OLD" ] && [ "$OLD" != $$ ] && kill -0 "$OLD" 2>/dev/null; then echo "the 24/7 loop is already running (pid $OLD): not starting a second one"; exit 0; fi
rm -f "$HOME_DIR/STOP"
echo $$ > "$HOME_DIR/forever.pid"
trap 'rm -f "$HOME_DIR/forever.pid"' EXIT
nap() { for ((i = 0; i < $1 * 3; i++)); do [ -f "$HOME_DIR/STOP" ] && return; sleep 20; done; }
say() { echo "[$(date '+%F %H:%M')] $*"; }

if [ "$BRAIN" = local ]; then   # the models: pulled (or resumed) before the first round
  for m in "$EMBED_MODEL" "$LOCAL_MODEL"; do
    until ollama list 2>/dev/null | grep -q "^$m"; do
      curl -s "$OLLAMA_URL/api/version" >/dev/null || { say "starting Ollama"; brew services start ollama >/dev/null 2>&1 || open -a Ollama 2>/dev/null || (ollama serve >/dev/null 2>&1 &); sleep 8; }
      say "downloading $m (once; resumes if cut off)"; ollama pull "$m" || nap 2
      [ -f "$HOME_DIR/STOP" ] && exit 0
    done
  done
fi

EMPTY=0
while [ ! -f "$HOME_DIR/STOP" ]; do
  KEPT=0; LIMIT=0
  for a in $AGENTS; do
    [ -f "$HOME_DIR/STOP" ] && break
    say "turn: $a agent"
    FOREVER=1 ROUNDS=1 HOURS=24 "$HERE/run.sh" "$a"
    case "$(cat "$HOME_DIR/$a/last_stop" 2>/dev/null)" in
      kept|failed) KEPT=1 ;;   # it did something (even a thrown-away try teaches it a lesson)
      limit) LIMIT=1 ;;
    esac
  done
  [ -f "$HOME_DIR/STOP" ] && break
  if [ $LIMIT = 1 ]; then say "a model limit or Ollama problem: resting $LIMIT_REST_MIN min"; nap "$LIMIT_REST_MIN"; continue; fi
  if [ $KEPT = 1 ]; then EMPTY=0; else EMPTY=$((EMPTY + 1)); fi
  if [ $EMPTY -ge 2 ]; then say "no agent changed anything twice: resting $IDLE_REST_MIN min (add to the BACKLOG.md files)"; nap "$IDLE_REST_MIN"; EMPTY=0
  else say "resting $REST_MIN min"; nap "$REST_MIN"; fi
done
rm -f "$HOME_DIR/STOP"
say "stopped"
