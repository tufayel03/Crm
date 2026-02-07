#!/usr/bin/env bash
set -euo pipefail

# Bootstrap a fresh Ubuntu VPS, then run deploy.sh.
# Usage example:
# REPO_URL=https://github.com/you/repo.git DOMAIN=crm.example.com SSL_EMAIL=ops@example.com ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='StrongPass123!' JWT_SECRET='super-secret' bash deploy/vps/bootstrap.sh

REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/matlance}"

if [[ -z "$REPO_URL" ]]; then
  echo "ERROR: REPO_URL is required"
  exit 1
fi

sudo apt-get update
sudo apt-get install -y curl git rsync nginx certbot python3-certbot-nginx

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if [[ ! -d "$APP_DIR/.git" ]]; then
  sudo mkdir -p "$(dirname "$APP_DIR")"
  sudo git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  cd "$APP_DIR"
  sudo git fetch --all
  sudo git checkout "$BRANCH"
  sudo git pull --ff-only origin "$BRANCH"
fi

cd "$APP_DIR"
chmod +x deploy/vps/deploy.sh
DOMAIN="${DOMAIN:-crm.matlance.com}" \
SSL_EMAIL="${SSL_EMAIL:-admin@matlance.com}" \
MONGO_URI="${MONGO_URI:-}" \
NODE_ENV="${NODE_ENV:-production}" \
PORT="${PORT:-5000}" \
CORS_ORIGINS="${CORS_ORIGINS:-}" \
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@matlance.com}" \
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}" \
ADMIN_NAME="${ADMIN_NAME:-Admin}" \
JWT_SECRET="${JWT_SECRET:-}" \
JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-7d}" \
TRACKING_LINK_SECRET="${TRACKING_LINK_SECRET:-}" \
APP_DIR="$APP_DIR" \
bash deploy/vps/deploy.sh
