#!/usr/bin/env bash
set -euo pipefail

ROOT="/root/bot-teste"
DOMAIN="bot.portoplan.com.br"
BRANCH="recuperacao-backend"

cd "$ROOT"
git reset --hard HEAD >/dev/null 2>&1 || true
git clean -fd -e backend/.env -e frontend/.env -e frontend/.env.local >/dev/null 2>&1 || true
git pull --ff-only origin "$BRANCH"

if ! command -v nginx >/dev/null 2>&1; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y nginx
fi

cat >/etc/nginx/sites-available/portoplan-bot <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name bot.portoplan.com.br;

    root /root/bot-teste/frontend-mvp;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:4000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

ln -sfn /etc/nginx/sites-available/portoplan-bot /etc/nginx/sites-enabled/portoplan-bot
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx
systemctl reload nginx

if ! curl -fsS http://127.0.0.1:4000/auth/me >/dev/null 2>&1; then
  if ! pgrep -f "$ROOT/backend/dist/server.js" >/dev/null 2>&1; then
    cd "$ROOT/backend"
    nohup node dist/server.js > "$ROOT/backend-mvp.log" 2>&1 &
    sleep 3
  fi
fi

echo "HTTP_OK: http://$DOMAIN"

if ! command -v certbot >/dev/null 2>&1; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y certbot python3-certbot-nginx
fi

set +e
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect
CERT_STATUS=$?
set -e

if [ "$CERT_STATUS" -eq 0 ]; then
  echo "HTTPS_OK: https://$DOMAIN"
else
  echo "HTTPS_PENDING: DNS pode ainda nao estar apontando para este servidor."
  echo "O site deve responder em: http://$DOMAIN"
fi
