#!/bin/bash
# Sends one WhatsApp message through CallMeBot (free). run.sh calls it after every round.
#   notify.sh "text"          send (does nothing until WHATSAPP_PHONE and CALLMEBOT_KEY are set)
# Set them in ~/fs360-night/env (private, outside the repo):
#   WHATSAPP_PHONE=+8801XXXXXXXXX
#   CALLMEBOT_KEY=123456
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/config.sh"
[ -f "$HOME_DIR/env" ] && source "$HOME_DIR/env"
[ -n "${WHATSAPP_PHONE:-}" ] && [ -n "${CALLMEBOT_KEY:-}" ] || exit 0
curl -s --max-time 20 -G "https://api.callmebot.com/whatsapp.php" \
  --data-urlencode "phone=$WHATSAPP_PHONE" --data-urlencode "text=${1:0:900}" --data-urlencode "apikey=$CALLMEBOT_KEY" \
  -o "$HOME_DIR/notify-last.txt" -w '%{http_code}\n' >> "$HOME_DIR/notify.log" 2>&1
