#!/bin/bash
# Asks the 24/7 loop to stop after the round it is in.
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/config.sh"
touch "$HOME_DIR/STOP" && echo "stopping after the current round (status: tools/night-agent/status.sh)"
