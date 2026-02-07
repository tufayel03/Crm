#!/usr/bin/env bash
set -euo pipefail

# One-command production deploy for Ubuntu VPS.
# Usage example:
# DOMAIN=crm.example.com SSL_EMAIL=ops@example.com ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='StrongPass123!' JWT_SECRET='super-secret' ./deploy/vps/deploy.sh

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
DOMAIN="${DOMAIN:-crm.matlance.com}"
SSL_EMAIL="${SSL_EMAIL:-admin@matlance.com}"
MONGO_URI="${MONGO_URI:-mongodb://127.0.0.1:27017/matlance}"
NODE_ENV="${NODE_ENV:-production}"
PORT="${PORT:-5000}"
CORS_ORIGINS="${CORS_ORIGINS:-}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@matlance.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Matlancebd@142003}"
ADMIN_NAME="${ADMIN_NAME:-Matlancebd}"
JWT_SECRET="${JWT_SECRET:-18d33c59fb7159ea8b49a80da7edf9a05723f82cc792c15ce54993b90cd38cfa2b424da7c31b1db9b7d44b27f8b98a34}"
JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-7d}"
TRACKING_LINK_SECRET="${TRACKING_LINK_SECRET:-}"

if [[ -z "$DOMAIN" ]]; then
  echo "ERROR: DOMAIN is required"
  exit 1
fi
if [[ -z "$SSL_EMAIL" ]]; then
  echo "ERROR: SSL_EMAIL is required"
  exit 1
fi
if [[ -z "$ADMIN_EMAIL" || -z "$ADMIN_PASSWORD" ]]; then
  echo "ERROR: ADMIN_EMAIL and ADMIN_PASSWORD are required"
  exit 1
fi
if [[ -z "$JWT_SECRET" ]]; then
  echo "ERROR: JWT_SECRET is required"
  exit 1
fi
if [[ -z "$TRACKING_LINK_SECRET" ]]; then
  TRACKING_LINK_SECRET="$JWT_SECRET"
fi
if [[ -z "$CORS_ORIGINS" ]]; then
  CORS_ORIGINS="https://$DOMAIN"
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm not found. Run bootstrap first."
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm i -g pm2
fi

sudo mkdir -p "/var/www/$DOMAIN/html"

set_env_value() {
  local file="$1"
  local key="$2"
  local val="$3"
  if grep -q "^${key}=" "$file"; then
    sed -i "s#^${key}=.*#${key}=${val}#g" "$file"
  else
    printf "%s=%s\n" "$key" "$val" >> "$file"
  fi
}

echo "Installing dependencies..."
cd "$APP_DIR"
npm install
npm --prefix client install
npm --prefix server install

echo "Building frontend..."
cat > "$APP_DIR/client/.env.production" <<EOF
VITE_API_URL=/api
VITE_SOCKET_URL=https://$DOMAIN
EOF
npm --prefix client run build

echo "Preparing backend environment..."
mkdir -p "$APP_DIR/server"
touch "$APP_DIR/server/.env"

set_env_value "$APP_DIR/server/.env" "NODE_ENV" "$NODE_ENV"
set_env_value "$APP_DIR/server/.env" "PORT" "$PORT"
set_env_value "$APP_DIR/server/.env" "MONGO_URI" "$MONGO_URI"
set_env_value "$APP_DIR/server/.env" "JWT_SECRET" "$JWT_SECRET"
set_env_value "$APP_DIR/server/.env" "JWT_EXPIRES_IN" "$JWT_EXPIRES_IN"
set_env_value "$APP_DIR/server/.env" "TRACKING_LINK_SECRET" "$TRACKING_LINK_SECRET"
set_env_value "$APP_DIR/server/.env" "CORS_ORIGINS" "$CORS_ORIGINS"
set_env_value "$APP_DIR/server/.env" "ADMIN_EMAIL" "$ADMIN_EMAIL"
set_env_value "$APP_DIR/server/.env" "ADMIN_PASSWORD" "$ADMIN_PASSWORD"
set_env_value "$APP_DIR/server/.env" "ADMIN_NAME" "$ADMIN_NAME"
set_env_value "$APP_DIR/server/.env" "APP_BASE_URL" "https://$DOMAIN"
set_env_value "$APP_DIR/server/.env" "PUBLIC_BASE_URL" "https://$DOMAIN"
set_env_value "$APP_DIR/server/.env" "API_URL" "https://$DOMAIN"

echo "Syncing frontend build..."
sudo rsync -a --delete "$APP_DIR/client/dist/" "/var/www/$DOMAIN/html/"

NGINX_CONF="/etc/nginx/sites-available/matlance-$DOMAIN.conf"
echo "Writing Nginx config at $NGINX_CONF"
sudo tee "$NGINX_CONF" >/dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    root /var/www/$DOMAIN/html;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:$PORT/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:$PORT/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:$PORT/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location / {
        try_files \$uri /index.html;
    }
}
EOF

sudo ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/matlance-$DOMAIN.conf"
if [[ -f /etc/nginx/sites-enabled/default ]]; then
  sudo rm -f /etc/nginx/sites-enabled/default
fi

sudo nginx -t
sudo systemctl reload nginx

echo "Starting API with PM2..."
cd "$APP_DIR/server"
pm2 delete matlance-api >/dev/null 2>&1 || true
pm2 start index.js --name matlance-api --update-env
# Ensure PM2 auto-starts on VPS reboot so app stays online.
sudo env PATH="$PATH" pm2 startup systemd -u "$USER" --hp "$HOME" >/dev/null 2>&1 || true
pm2 save

echo "Provisioning SSL certificate..."
sudo certbot --nginx --non-interactive --agree-tos -m "$SSL_EMAIL" -d "$DOMAIN" --redirect || true
sudo systemctl reload nginx

echo "Deploy complete."
echo "Website: https://$DOMAIN"
echo "API health: https://$DOMAIN/"
