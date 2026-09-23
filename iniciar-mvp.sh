#!/usr/bin/env bash
set -u
ROOT="/root/bot-teste"
cd "$ROOT" || exit 1

echo "=== Atualizando PortoPlan MVP ==="
git reset --hard HEAD >/dev/null 2>&1 || true
git clean -fd -e backend/.env -e frontend/.env -e frontend/.env.local >/dev/null 2>&1 || true
git pull --ff-only origin recuperacao-backend || exit 2

echo "=== Verificando backend ==="
if ! curl -fsS http://127.0.0.1:4000/auth/me >/dev/null 2>&1; then
  if ! pgrep -f "$ROOT/backend/dist/server.js" >/dev/null 2>&1; then
    (cd "$ROOT/backend" && nohup node dist/server.js > "$ROOT/backend-mvp.log" 2>&1 &)
    sleep 3
  fi
fi

echo "=== Iniciando frontend MVP ==="
pkill -f "$ROOT/frontend-mvp/server.js" >/dev/null 2>&1 || true
nohup node "$ROOT/frontend-mvp/server.js" > "$ROOT/frontend-mvp.log" 2>&1 &
sleep 2

IP=$(hostname -I | awk '{print $1}')
if curl -fsS http://127.0.0.1/ >/dev/null 2>&1; then
  echo "MVP_OK"
  echo "Abra: http://$IP"
else
  echo "MVP_FALHOU"
  echo "Log frontend:"
  tail -40 "$ROOT/frontend-mvp.log" || true
  echo "Log backend:"
  tail -40 "$ROOT/backend-mvp.log" || true
  exit 3
fi
