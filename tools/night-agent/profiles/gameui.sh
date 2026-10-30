# The game UI/UX agent: the screens around "মাঠের মানুষ" (farmer pick, story, HUD, panels, buttons, touch controls).
TITLE="game UI/UX agent"
SCOPE_RE='^(src/components/game/|src/pages/public/(FarmGame|Saga|Games|Play)\.jsx$)'
EXCLUDE_RE='^$'
SMOKE=game          # smoke.mjs plays the farm game
DEV_PORT=5303
