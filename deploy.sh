#!/bin/bash
set -e

SERVER="root@192.168.3.151"
SSH_KEY="$HOME/.ssh/trazabilidad_minipc_ed25519"
REMOTE_PATH="/opt/clinica-dental"
LOCAL_PATH="$(dirname "$0")"

echo "Sincronizando con $SERVER:$REMOTE_PATH ..."

rsync -av -e "ssh -i $SSH_KEY" --exclude node_modules --exclude '*.db' --exclude '.git' \
  "$LOCAL_PATH/" "$SERVER:$REMOTE_PATH/"

echo "Reiniciando servidor..."
ssh -i "$SSH_KEY" "$SERVER" "cd $REMOTE_PATH && npm install --omit=dev && pm2 restart all"

echo "Listo."
