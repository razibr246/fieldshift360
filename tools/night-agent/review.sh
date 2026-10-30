#!/bin/bash
# Look at an agent's kept work and take it (or not).
#   review.sh game [date]            what was kept, the runner notes, the screenshots (date defaults to today)
#   review.sh project diff [date]    the full code change
#   review.sh game apply [date]      copy the kept changes into your checkout as uncommitted edits (you test and commit)
#   review.sh game discard [date]    delete that day's branch
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/config.sh"
load_agent "${1:-}" || { echo "usage: review.sh <$(echo $AGENTS | tr ' ' '|')> [diff|apply|discard] [date]"; exit 1; }
shift
CMD=show; case "${1:-}" in diff|apply|discard) CMD=$1; shift ;; esac
DATE="${1:-$(date +%F)}"; BRANCH="$BRANCH_PREFIX/$DATE"
cd "$REPO" || exit 1
git rev-parse -q --verify "refs/heads/$BRANCH" >/dev/null || { echo "no branch $BRANCH (have: $(git branch --list "$BRANCH_PREFIX/*" | tr -d ' *' | tr '\n' ' '))"; exit 1; }
BASE=$(cat "$D/base/$DATE" 2>/dev/null) || { echo "no baseline recorded for $DATE"; exit 1; }

case $CMD in
  show)
    echo "== $TITLE, kept on $BRANCH"; git log --format='  %h %s' "$BASE..$BRANCH"
    echo; echo "== files"; git diff --stat "$BASE" "$BRANCH"
    echo; echo "== runner notes"; grep "^- $DATE .*runner:" "$MEMORY/LOG.md" | sed 's/^/  /'
    echo; echo "== screenshots $SHOTS   log $LOGS/$DATE.log"
    open "$SHOTS" 2>/dev/null ;;
  diff) git diff "$BASE" "$BRANCH" ;;
  apply)
    if git diff "$BASE" "$BRANCH" | git apply --check 2>/dev/null; then
      git diff "$BASE" "$BRANCH" | git apply && echo "applied: your checkout has the $NAME agent's changes, uncommitted. Check (npm test, npm run dev), then commit."
    else
      echo "Your checkout changed the same lines since, so it does not apply cleanly."
      echo "Try:  git diff $BASE $BRANCH | git apply --3way     (then resolve the marked conflicts)"
    fi ;;
  discard)
    [ "$(git -C "$WORK" rev-parse --abbrev-ref HEAD 2>/dev/null)" = "$BRANCH" ] && git worktree remove --force "$WORK"
    git branch -D "$BRANCH" && rm -f "$D/base/$DATE" "$D/base/$DATE.checked" ;;
esac
