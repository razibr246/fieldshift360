# Settings shared by the FS360 agents. Each agent's own scope is in profiles/<name>.sh.
# run.sh and forever.sh source this file; edit it, not them. Any value can also be set as an environment variable.

AGENTS=${AGENTS:-"game gameui project"}   # forever.sh takes turns between these, one round each

# Which model does the work: "local" (Ollama on this Mac, free, runs 24/7) or "claude" (Claude Code, stronger).
BRAIN=${BRAIN:-local}
LOCAL_MODEL=${LOCAL_MODEL:-qwen3.5:9b}          # 16 GB Mac: about 8 GB in use; qwen3:8b or qwen2.5-coder:7b are lighter
EMBED_MODEL=${EMBED_MODEL:-nomic-embed-text}    # turns code into vectors for the RAG index
LOCAL_CTX=${LOCAL_CTX:-12288}                   # tokens the local model sees at once (more needs more RAM)
OLLAMA_URL=${OLLAMA_URL:-http://127.0.0.1:11434}
CLAUDE_MODEL=${CLAUDE_MODEL:-claude-opus-5-5}   # or claude-sonnet-5-5 to spend less of your plan
BUDGET_USD=${BUDGET_USD:-3}                     # per-round cap when Claude runs on an API key

# How long run.sh goes when you start it by hand (forever.sh runs one round per agent per turn).
HOURS=${HOURS:-6}
ROUNDS=${ROUNDS:-12}
REST_MIN=${REST_MIN:-10}                 # forever.sh: rest between turns (lets the Mac cool)
LIMIT_REST_MIN=${LIMIT_REST_MIN:-60}     # forever.sh: rest after a Claude usage limit
IDLE_REST_MIN=${IDLE_REST_MIN:-120}      # forever.sh: rest when no agent changed anything in a whole turn, twice

# Where things live. The repo is found from this file; everything else sits outside it.
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOME_DIR="$HOME/fs360-night"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# load_agent <name>: the agent's profile and its folders (worktree, memory, index, screenshots, logs)
load_agent() {
  NAME=$1
  local here; here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  [ -f "$here/profiles/$NAME.sh" ] || { echo "no agent '$NAME' (have: $(ls "$here/profiles" | sed -n 's/\.sh$//p' | tr '\n' ' '))"; return 1; }
  source "$here/profiles/$NAME.sh"
  RULES_FILE="$here/profiles/$NAME.md"
  D="$HOME_DIR/$NAME"
  WORK="$D/work"; MEMORY="$D/memory"; SHOTS="$D/shots"; LOGS="$D/logs"
  BRANCH_PREFIX="agent-$NAME"
}
