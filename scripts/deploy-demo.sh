#!/usr/bin/env bash
# Deploy the x402-bazaar demo to a fresh Ubuntu server (Contabo, DigitalOcean, etc.).
# Usage:  ./scripts/deploy-demo.sh user@host [domain]
# Serves the clickable demo (UI + discovery API, seeded with real on-chain services).
set -euo pipefail
HOST="${1:?usage: deploy-demo.sh user@host [domain]}"
DOMAIN="${2:-}"
APP_DIR="/opt/x402-bazaar"

echo "▸ syncing repo to $HOST:$APP_DIR"
ssh "$HOST" "sudo mkdir -p $APP_DIR && sudo chown \$(whoami) $APP_DIR"
rsync -az --delete --exclude node_modules --exclude '.git' --exclude 'assets' --exclude 'video' \
  ./ "$HOST:$APP_DIR/"

echo "▸ installing node 22 + deps + starting under pm2"
ssh "$HOST" bash -s <<REMOTE
set -e
cd $APP_DIR
if ! command -v node >/dev/null || [ "\$(node -v | cut -dv -f2 | cut -d. -f1)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
command -v pm2 >/dev/null || sudo npm i -g pm2
npm install --omit=dev || npm install
pm2 delete x402-bazaar-demo 2>/dev/null || true
PORT=8402 pm2 start "npx tsx packages/facilitator/src/demo-server.ts" --name x402-bazaar-demo
pm2 save
REMOTE

if [ -n "$DOMAIN" ]; then
  echo "▸ nginx + TLS for $DOMAIN"
  ssh "$HOST" bash -s <<REMOTE
set -e
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo tee /etc/nginx/sites-available/x402-bazaar >/dev/null <<NGINX
server {
  listen 80;
  server_name $DOMAIN;
  location / { proxy_pass http://127.0.0.1:8402; proxy_set_header Host \\\$host; }
}
NGINX
sudo ln -sf /etc/nginx/sites-available/x402-bazaar /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN || true
REMOTE
  echo "✅ live at https://$DOMAIN"
else
  echo "✅ demo running on $HOST:8402 (add a domain arg for nginx+TLS)"
fi
