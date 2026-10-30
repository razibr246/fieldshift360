# The project agent: the whole FieldShift 360 app except the game (the game agent's) and generated data.
TITLE="project agent"
SCOPE_RE='^(src/(App|store|main)\.jsx$|src/index\.css$|src/(pages|components|engine|layouts|radar|ai|config)/)'
EXCLUDE_RE='^(src/components/game/|src/pages/public/(FarmGame|Saga|Games|Play)\.jsx$)'
SMOKE=pages         # smoke.mjs opens the main public, farmer, officer and abroad pages
DEV_PORT=5301
