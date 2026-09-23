#!/usr/bin/env bash
set -euo pipefail

KEY="/root/.ssh/portoplan_github_actions"
PUB="$KEY.pub"
AUTH="/root/.ssh/authorized_keys"

mkdir -p /root/.ssh
chmod 700 /root/.ssh

if [ ! -f "$KEY" ]; then
  ssh-keygen -t ed25519 -N "" -C "github-actions-portoplan-bot" -f "$KEY"
fi

touch "$AUTH"
chmod 600 "$AUTH"
grep -qxF "$(cat "$PUB")" "$AUTH" || cat "$PUB" >> "$AUTH"

echo
echo "CHAVE_CONFIGURADA"
echo "Copie a linha abaixo inteira para o secret DEPLOY_SSH_KEY_B64 no GitHub:"
echo
base64 -w 0 "$KEY"
echo
echo
echo "Depois disso, o workflow Deploy DigitalOcean podera atualizar o servidor sozinho."
