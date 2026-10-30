#!/bin/bash
# Rounds of one agent. Each round: the agent makes one change in its own worktree, then npm test + npm run build
# + a headless browser check decide: pass = commit on agent-<name>/<date>, fail = thrown away.
# Your checkout is never edited and nothing is pushed. Stop: touch ~/fs360-night/STOP
#   tools/night-agent/run.sh game              rounds of the game agent, now
#   tools/night-agent/run.sh project 01:00     the project agent, starting at 01:00
# forever.sh calls this with ROUNDS=1 for each agent in turn.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/config.sh"
load_agent "${1:-}" || exit 1
[ -f "$HOME_DIR/env" ] && source "$HOME_DIR/env"   # optional: CLAUDE_CODE_OAUTH_TOKEN=... (claude setup-token)
if [ $# -ge 2 ]; then echo "waiting until $2 …"; until [ "$(date +%H:%M)" = "$2" ]; do sleep 20; done; fi

DATE=$(date +%F)
BRANCH="$BRANCH_PREFIX/$DATE"
mkdir -p "$MEMORY" "$SHOTS" "$LOGS" "$D/base"
exec > >(tee -a "$LOGS/$DATE.log") 2>&1
if ! mkdir "$D/lock" 2>/dev/null; then echo "the $NAME agent is already running (remove $D/lock if not)"; exit 1; fi
trap 'rm -rf "$D/lock"' EXIT
rm -f "$D/last_stop"
[ -z "${FOREVER:-}" ] && rm -f "$HOME_DIR/STOP"   # under forever.sh the STOP file must stay for it to see
for f in "$HERE/memory/$NAME"/*.md; do [ -f "$MEMORY/$(basename "$f")" ] || cp "$f" "$MEMORY/"; done

say() { echo "[$(date +%H:%M:%S) $NAME] $*"; }
note() {   # the agent's log, and the same line to WhatsApp (notify.sh; silent until it is set up)
  printf -- '- %s %s\n' "$(date '+%F %H:%M')" "$*" >> "$MEMORY/LOG.md"
  "$HERE/notify.sh" "FS360 $TITLE $(date +%H:%M): ${*#runner: }" &
}
stop() { echo "$1" > "$D/last_stop"; }
export AGENT_DIR="$D" MEMORY LOCAL_MODEL EMBED_MODEL LOCAL_CTX OLLAMA_URL SCOPE_RE EXCLUDE_RE RULES_FILE

gate() {   # $1 = label. Prints why it failed; returns 0 when the app is still whole
  npm test > "$LOGS/$DATE-$1-test.txt" 2>&1 || { echo "npm test failed:"; grep -E "^not ok|# fail|Error|assert" "$LOGS/$DATE-$1-test.txt" | head -15; return 1; }
  npm run build > "$LOGS/$DATE-$1-build.txt" 2>&1 || { echo "npm run build failed:"; tail -15 "$LOGS/$DATE-$1-build.txt"; return 1; }
  node "$HERE/smoke.mjs" "$WORK" "$DEV_PORT" "$SHOTS/$DATE-$1" "$CHROME" "$SMOKE" || return 1
}

# ---- 1. the worktree: today's branch, or a new one from your checkout as it is now (uncommitted work included)
cd "$REPO" || exit 1
if [ "$(git -C "$WORK" rev-parse --abbrev-ref HEAD 2>/dev/null)" != "$BRANCH" ]; then
  git worktree list --porcelain | grep -qx "worktree $WORK" && git worktree remove --force "$WORK"
  rm -rf "$WORK"; git worktree prune
  if git rev-parse -q --verify "refs/heads/$BRANCH" >/dev/null; then
    git worktree add -q "$WORK" "$BRANCH" || exit 1
  else
    IDX=$(mktemp); rm -f "$IDX"   # a throwaway index: your real index and files are only read
    GIT_INDEX_FILE="$IDX" git read-tree HEAD && GIT_INDEX_FILE="$IDX" git add -A
    TREE=$(GIT_INDEX_FILE="$IDX" git write-tree); rm -f "$IDX"
    BASE=$(git commit-tree "$TREE" -p HEAD -m "Agent baseline: the checkout as it was on $DATE")
    git worktree add -q -b "$BRANCH" "$WORK" "$BASE" || exit 1
    echo "$BASE" > "$D/base/$DATE"; rm -f "$D/base/$DATE.checked"
    say "new $BRANCH from a snapshot of your checkout"
    # yesterday's kept work that you have not applied yet comes along, if it still fits
    PREV=$(git for-each-ref --sort=-refname --format='%(refname:short)' "refs/heads/$BRANCH_PREFIX/" | grep -v "/$DATE$" | head -1)
    PB=$(cat "$D/base/${PREV##*/}" 2>/dev/null)
    if [ -n "$PREV" ] && [ -n "$PB" ] && [ -n "$(git diff "$PB" "$PREV")" ]; then
      if git diff "$PB" "$PREV" | git -C "$WORK" apply --reverse --check 2>/dev/null; then say "$PREV is already in your checkout"
      elif git diff "$PB" "$PREV" | git -C "$WORK" apply 2>/dev/null; then
        git -C "$WORK" add -A && git -C "$WORK" commit -q -m "Carried over: the $NAME agent's unreviewed work from ${PREV##*/}"
        say "carried over $PREV (not applied to your checkout yet)"
      else say "$PREV no longer fits your checkout: left on its branch for review"; fi
    fi
  fi
fi
cd "$WORK" || exit 1
LOCKHASH=$(shasum package-lock.json | cut -c1-12)
if [ ! -d node_modules ] || [ "$(cat "$D/lockhash" 2>/dev/null)" != "$LOCKHASH" ]; then
  say "installing packages"
  npm ci --prefer-offline --no-audit --no-fund --loglevel=error || { say "npm ci failed"; stop setup; exit 1; }
  echo "$LOCKHASH" > "$D/lockhash"
fi
if [ ! -f "$D/base/$DATE.checked" ]; then
  say "checking the starting point"
  if ! WHY=$(gate base); then
    if git log -1 --format=%s | grep -q "^Carried over"; then
      say "the carried-over work breaks with today's checkout: dropping it"; git reset -q --hard HEAD~1
      WHY=$(gate base) && WHY=""
    fi
  else WHY=""; fi
  printf '%s' "$WHY" > "$D/base/$DATE.checked"
  [ -n "$WHY" ] && { say "the starting point already fails:"; echo "$WHY"; }
fi
BROKEN=$(cat "$D/base/$DATE.checked")
[ -n "$BROKEN" ] && BROKEN="The app ALREADY fails its checks before your work. Fix exactly that first, nothing else:
$BROKEN"

ask() {   # $1 = round. Runs the chosen brain inside the worktree.
  if [ "$BRAIN" = claude ]; then
    local prompt
    prompt="$(sed -e "/{{RULES}}/{r $RULES_FILE" -e 'd;}' "$HERE/PROMPT.md")

Memory folder: $MEMORY
Repo (your working directory): $WORK
Today: $DATE, round $1.
$BROKEN"
    perl -e 'alarm shift; exec @ARGV' 2700 claude -p "$prompt" --model "$CLAUDE_MODEL" --permission-mode acceptEdits \
      --add-dir "$MEMORY" --max-budget-usd "$BUDGET_USD" --no-session-persistence \
      --allowedTools Read Edit Write Glob Grep "Bash(npm test)" "Bash(npm test:*)" "Bash(npm run build)" "Bash(node --test:*)" \
        "Bash(git diff:*)" "Bash(git status:*)" "Bash(git log:*)" "Bash(grep:*)" "Bash(rg:*)" "Bash(ls:*)" "Bash(head:*)" "Bash(wc:*)"
  else
    BROKEN="$BROKEN" perl -e 'alarm shift; exec @ARGV' 3600 node "$HERE/agent.mjs" round
  fi
}
tell() { [ "$BRAIN" = local ] && node "$HERE/agent.mjs" "$@" >/dev/null 2>&1; true; }
throw() { git reset -q --hard HEAD; git clean -qfd; }

# ---- 2. rounds
START=$(date +%s); IDLE=0
for ((r = 1; r <= ROUNDS; r++)); do
  [ -f "$HOME_DIR/STOP" ] && { say "STOP file found"; stop stopped; break; }
  (( $(date +%s) - START > HOURS * 3600 )) && { say "time is up"; break; }
  R="$(date +%H%M)"
  say "round $r: asking $BRAIN"
  ask "$r" > "$LOGS/$DATE-$R-agent.txt" 2>&1
  tail -4 "$LOGS/$DATE-$R-agent.txt"
  if grep -qiE "usage limit|rate limit|limit reached|credit balance|not logged in|invalid api key|ollama is not running|fetch failed|ECONNREFUSED" "$LOGS/$DATE-$R-agent.txt"; then
    say "the model cannot go on (limit, login or Ollama down)"; throw; stop limit; break
  fi
  MSG=$(head -1 LAST.txt 2>/dev/null); rm -f LAST.txt
  CHANGED=$(git status --porcelain --untracked-files=all | cut -c4-)
  if [ -z "$CHANGED" ]; then
    IDLE=$((IDLE + 1)); say "no change"; note "runner: the agent changed nothing."; tell failed "no edit applied"; stop nochange
    [ $IDLE -ge 2 ] && { say "two empty rounds"; break; }; continue
  fi
  IDLE=0
  OUT=$(echo "$CHANGED" | grep -vE "$SCOPE_RE"; echo "$CHANGED" | grep -E "$EXCLUDE_RE")
  if [ -n "$OUT" ]; then
    say "outside its scope: $OUT"; throw; note "runner: THROWN AWAY, it edited files outside its scope: $(echo $OUT)"
    tell failed "it edited files outside its scope: $(echo $OUT)"; stop failed; continue
  fi
  if WHY=$(gate "$R"); then
    git add -A && git commit -q -m "${MSG:-Round $r of the $NAME agent}" -m "FS360 $NAME agent ($BRAIN), $DATE. Passed npm test, npm run build and the headless browser check."
    say "PASS → $(git log -1 --format='%h %s')"; BROKEN=""; printf '' > "$D/base/$DATE.checked"
    note "runner: KEPT $(git log -1 --format=%h): ${MSG:-no message}"; tell done; stop kept
  else
    say "FAIL, thrown away:"; echo "$WHY"; throw
    note "runner: THROWN AWAY (${MSG:-no message}). Why: $(echo "$WHY" | head -6 | tr '\n' ' ')"; tell failed "$WHY"; stop failed
  fi
done
say "kept today: $(git rev-list --count "$(cat "$D/base/$DATE")..HEAD") commit(s) on $BRANCH. Review: tools/night-agent/review.sh $NAME"
