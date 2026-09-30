#!/bin/sh
set -e

git config --global --add safe.directory "*" >/dev/null 2>&1 || true
cd /var/www/html

GIT_BRANCH="${GIT_BRANCH:-main}"
DOCUMENT_ROOT="${DOCUMENT_ROOT:-public}"

if [ -n "$GIT_REPOSITORY_URL" ]; then
  AUTH_REPO_URL="$GIT_REPOSITORY_URL"
  if [ -n "$GITHUB_TOKEN" ]; then
    AUTH_REPO_URL=$(echo "$GIT_REPOSITORY_URL" | sed -E "s#https://#https://${GITHUB_TOKEN}@#")
  fi
  if [ ! -d .git ]; then
    echo "[Runner] Clonando repositório PHP: $GIT_REPOSITORY_URL (branch: $GIT_BRANCH)..."
    git clone --branch "$GIT_BRANCH" "$AUTH_REPO_URL" .
  else
    echo "[Runner] Atualizando repositório PHP (branch: $GIT_BRANCH)..."
    git remote set-url origin "$AUTH_REPO_URL"
    git fetch origin "$GIT_BRANCH"
    git checkout "$GIT_BRANCH"
    git pull origin "$GIT_BRANCH"
  fi
elif [ ! -f index.php ] && [ ! -f public/index.php ]; then
  echo '[Runner] Criando index.php demo...'
  mkdir -p public
  cat << 'DEMO_EOF' > public/index.php
<?php
header('Content-Type: application/json');
echo json_encode([
    'status' => 'online',
    'runtime' => 'PHP ' . PHP_VERSION,
    'message' => 'ServApp PHP/Laravel ativo no Cosmos-Server'
]);
DEMO_EOF
fi

if [ -d "/var/www/html/$DOCUMENT_ROOT" ]; then
  sed -i "s#DocumentRoot /var/www/html.*#DocumentRoot /var/www/html/$DOCUMENT_ROOT#g" /etc/apache2/sites-available/000-default.conf
else
  sed -i "s#DocumentRoot /var/www/html.*#DocumentRoot /var/www/html#g" /etc/apache2/sites-available/000-default.conf
fi

if [ -f composer.json ]; then
  INSTALL_CMD="${INSTALL_CMD:-composer install --no-interaction --prefer-dist --optimize-autoloader}"
  echo "[Runner] Executando: $INSTALL_CMD"
  eval "$INSTALL_CMD"
fi

if [ -n "$BUILD_CMD" ]; then
  echo "[Runner] Executando: $BUILD_CMD"
  eval "$BUILD_CMD"
fi

if [ -f .env.example ] && [ ! -f .env ]; then
  cp .env.example .env
  if [ -f artisan ]; then
    php artisan key:generate --force || true
  fi
fi

if [ -d storage ] && [ -d bootstrap/cache ]; then
  chmod -R 775 storage bootstrap/cache || true
fi
chown -R www-data:www-data /var/www/html || true

echo "[Runner] Iniciando Apache..."
exec apache2-foreground
