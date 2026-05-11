#!/bin/bash
# Ficheiro: scripts/deploy.sh | Função: setup inicial do VPS Hostinger (Ubuntu 22.04) — RideFriend API (P9)
# Executar como root no VPS recém-provisionado:  bash deploy.sh
set -euo pipefail

# ───────────────────────────────────────────────────────────────────────────────
# Configuração — pode ser passada por env ou perguntada.
# ───────────────────────────────────────────────────────────────────────────────
APP_USER="${APP_USER:-ridefriend}"
APP_DIR="/home/${APP_USER}/ridefriend"
BACKEND_DIR="${APP_DIR}/backend"
DOMAIN="${DOMAIN:-api.ridefriend.ao}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@ridefriend.ao}"

if [[ -z "${REPO_URL:-}" ]]; then
  read -rp "URL do repositório GitHub (ex.: https://github.com/org/ridefriend.git): " REPO_URL
fi

if [[ $EUID -ne 0 ]]; then
  echo "Este script tem de ser executado como root." >&2
  exit 1
fi

echo "▶ A actualizar o sistema..."
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

echo "▶ A instalar dependências base..."
apt-get install -y curl git build-essential ufw ca-certificates gnupg

echo "▶ A instalar Node.js 20 LTS via NodeSource..."
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "▶ A instalar PM2 globalmente..."
npm install -g pm2

echo "▶ A instalar Nginx + Certbot..."
apt-get install -y nginx certbot python3-certbot-nginx

echo "▶ A configurar firewall (UFW: 22, 80, 443)..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
yes | ufw enable || true

echo "▶ A criar utilizador '${APP_USER}'..."
if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "${APP_USER}"
fi

echo "▶ A clonar repositório..."
sudo -u "${APP_USER}" -H bash -c "
  if [ ! -d '${APP_DIR}/.git' ]; then
    git clone '${REPO_URL}' '${APP_DIR}'
  else
    cd '${APP_DIR}' && git pull --ff-only
  fi
"

echo "▶ A copiar ficheiro .env (lembra-te de o editar com chaves reais)..."
ENV_FILE="/etc/ridefriend.env"
if [[ ! -f "${ENV_FILE}" ]]; then
  cp "${BACKEND_DIR}/.env.example" "${ENV_FILE}"
  chown root:"${APP_USER}" "${ENV_FILE}"
  chmod 640 "${ENV_FILE}"
  echo "  ⚠ Edita ${ENV_FILE} com SUPABASE_*, AT_*, CORS_ORIGINS antes de iniciar a API."
fi

echo "▶ A instalar dependências npm e a fazer build..."
sudo -u "${APP_USER}" -H bash -c "
  cd '${BACKEND_DIR}'
  npm ci
  npm run build
"

echo "▶ A configurar Nginx..."
install -d /var/www/certbot
install -d /var/log/ridefriend
chown -R "${APP_USER}":"${APP_USER}" /var/log/ridefriend
cp "${APP_DIR}/nginx/ridefriend.conf" /etc/nginx/sites-available/ridefriend.conf
ln -sf /etc/nginx/sites-available/ridefriend.conf /etc/nginx/sites-enabled/ridefriend.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "▶ A obter certificado SSL via Certbot..."
certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${ADMIN_EMAIL}" --redirect || \
  echo "  ⚠ Certbot falhou — provavelmente DNS ainda não aponta para este VPS. Reexecutar mais tarde."

echo "▶ A iniciar API com PM2..."
sudo -u "${APP_USER}" -H bash -c "
  cd '${BACKEND_DIR}'
  set -a && source '${ENV_FILE}' && set +a
  pm2 start ecosystem.config.js --env production --update-env
  pm2 save
"

echo "▶ A configurar PM2 startup..."
PM2_HOME="/home/${APP_USER}/.pm2" pm2 startup systemd -u "${APP_USER}" --hp "/home/${APP_USER}"
sudo -u "${APP_USER}" -H bash -c "pm2 save"

echo "✅ Deploy inicial concluído."
echo "   API em: https://${DOMAIN}/health"
echo "   Logs: /var/log/ridefriend/ e \`pm2 logs ridefriend-api\`"
