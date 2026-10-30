# FS360 agents (24/7)

Two AI agents keep improving FieldShift 360 on this Mac, day and night, with a local model (Ollama: free, no
cloud) or Claude Code. They never edit your checkout and never push. Each works in its own git worktree, and only
changes that pass every check are kept, as commits on a branch per day. You look and decide what to take.

| agent | works on | its browser check |
|---|---|---|
| **game** | `src/game/`, `src/components/game/`, the FarmGame, Saga, Games and Play pages | picks a farmer, plays the 3D game, the season clock must run |
| **project** | everything else in `src/`: pages, components, engine, layouts, radar, store, App (not `src/data/`, `src/voice/`) | opens 15 public, farmer, officer and abroad pages; none may throw or show its error screen |

```
forever.sh ─► game round ─► project round ─► rest 3 min ─► game round ─► …    (one model in RAM at a time)
                 │
                 └─ round: RAG retrieves the code ─► model edits ─► npm test (errors go back to the model)
                           ─► npm test + npm run build + browser check ─► pass: commit   fail: thrown away + lesson
```

## Start, watch, stop

```bash
tools/night-agent/start.sh       # opens a Terminal window running the 24/7 loop (closing that window stops it)
tools/night-agent/status.sh      # running? what each agent kept today, its last rounds, its next task
tools/night-agent/stop.sh        # stop after the current round
```

The first start downloads the models once (`nomic-embed-text` 274 MB, `qwen3.5:9b` 9 GB; a cut-off download
resumes). Keep the Mac plugged in with the lid open, and turn on System Settings → Battery → Options → *Prevent
automatic sleeping on power adapter when the display is off*. `caffeinate` keeps it awake while the loop runs.

To run as a background service instead of a Terminal window (`install.sh always`, removed with `install.sh unschedule`):
macOS does not let background jobs read ~/Downloads, so first move the repo (e.g. `~/code/fs360`) or give `/bin/bash`
Full Disk Access.

## Review (each morning)

```bash
tools/night-agent/review.sh game              # kept commits, files, runner notes; opens the screenshots
tools/night-agent/review.sh project diff      # the whole change
tools/night-agent/review.sh game apply        # bring it into your checkout, uncommitted; test, then commit
tools/night-agent/review.sh project discard   # throw that day away
tools/night-agent/review.sh game diff 2026-10-30   # any day
```

Each day starts a new branch (`agent-game/<date>`, `agent-project/<date>`) from your checkout as it is then.
Yesterday's kept work that you have not applied yet is carried over, if it still fits.

## Steer them

Each agent has its own memory in `~/fs360-night/<agent>/memory/`, kept for ever:

- `GOALS.md`: what you want (you write it). `BACKLOG.md`: tasks in order (you add; the agent adds ideas too).
- `LOG.md`: every round, with the runner's KEPT / THROWN AWAY notes. `LESSONS.md`: what went wrong, so it is not repeated.

When a backlog runs out, the model writes five new tasks from `GOALS.md` and the log. A task that fails three
times is skipped. The rules each agent works under are `profiles/<agent>.md`; its scope is `profiles/<agent>.sh`.
Add an agent by adding a profile pair and its name to `AGENTS` in `config.sh`.

## How the local agent works (`agent.mjs`)

1. **Index (RAG).** The agent's files, `AGENTS.md`, its `LESSONS.md` and `LOG.md` are cut into 40-line chunks and
   embedded with `nomic-embed-text`. Only changed files are embedded again (`~/fs360-night/<agent>/rag/`).
2. **Retrieve.** The task is embedded, and the closest chunks (about 7k tokens), a map of the nearby files'
   exports, the rules and recent lessons go to the model.
3. **Edit.** The model answers with SEARCH/REPLACE blocks. A block that does not match is shown the real code and
   retried; a failing `npm test` goes back to the model to fix (4 attempts).
4. **Judge.** `run.sh` decides with the tests, the build and the browser check. A kept task moves to Done; a failed
   one writes a lesson, which retrieval finds next time.

Try the retrieval yourself: `AGENT_DIR=~/fs360-night/project node tools/night-agent/agent.mjs ask "where is the season decision made"`
(run it inside the agent's worktree, `~/fs360-night/project/work`, with that agent's `SCOPE_RE`).

## Settings (`config.sh`, or environment variables)

| | |
|---|---|
| `AGENTS` | `"game project"`: who takes turns |
| `BRAIN` | `local` (Ollama, free, 24/7) or `claude` (stronger; uses your plan, rests an hour at a usage limit) |
| `LOCAL_MODEL`, `EMBED_MODEL`, `LOCAL_CTX` | `qwen3.5:9b` (`:7b` if the Mac gets slow), `nomic-embed-text`, 16384 |
| `REST_MIN`, `IDLE_REST_MIN` | rest between turns (3), and when no agent did anything twice (120) |
| `HOURS`, `ROUNDS` | for a manual run: `ROUNDS=1 tools/night-agent/run.sh project` |

A 14B local model is much weaker than Claude: many tries are thrown away by the checks, which is their job. What
survives is small, tested work. For a burst of bigger work: `BRAIN=claude tools/night-agent/run.sh game`.

## Safety

- Edits only inside the agent's worktree. A round that touches a file outside the agent's scope is thrown away.
- Nothing is pushed or deployed. The local agent runs no shell commands except `npm test`. Claude may only run
  tests, the build, read-only git and search, with no web access.
- Each round has a timeout (60 min local, 45 min Claude). The model is unloaded after each round to free RAM for
  the build and Chrome.
