#!/bin/sh
set -e

git config --global --add safe.directory "*" >/dev/null 2>&1 || true
cd /app

GIT_BRANCH="${GIT_BRANCH:-main}"
START_CMD="${START_CMD:-npm start}"

if [ -n "$GIT_REPOSITORY_URL" ]; then
  AUTH_REPO_URL="$GIT_REPOSITORY_URL"
  if [ -n "$GITHUB_TOKEN" ]; then
    AUTH_REPO_URL=$(echo "$GIT_REPOSITORY_URL" | sed -E "s#https://#https://${GITHUB_TOKEN}@#")
  fi
  if [ ! -d .git ]; then
    echo "[Runner] Clonando repositório: $GIT_REPOSITORY_URL (branch: $GIT_BRANCH)..."
    git clone --branch "$GIT_BRANCH" "$AUTH_REPO_URL" .
  else
    echo "[Runner] Atualizando repositório (branch: $GIT_BRANCH)..."
    git remote set-url origin "$AUTH_REPO_URL"
    git fetch origin "$GIT_BRANCH"
    git checkout "$GIT_BRANCH"
    git pull origin "$GIT_BRANCH"
  fi
elif [ ! -f package.json ] && [ ! -f server.js ] && [ ! -f index.js ]; then
  echo '[Runner] Criando aplicação de exemplo...'
  cat << 'DEMO_EOF' > server.js
const http = require('http');
const port = process.env.APP_PORT || process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'online', runtime: 'Node.js 24', message: 'ServApp Node.js ativo no Cosmos-Server' }));
}).listen(port, () => console.log(`Servidor ouvindo na porta ${port}`));
DEMO_EOF
fi

if [ -f package.json ]; then
  INSTALL_CMD="${INSTALL_CMD:-npm install}"
  echo "[Runner] Executando: $INSTALL_CMD"
  eval "$INSTALL_CMD"
fi

if [ -n "$BUILD_CMD" ]; then
  echo "[Runner] Executando: $BUILD_CMD"
  eval "$BUILD_CMD"
fi

echo "[Runner] Iniciando serviço: $START_CMD"
if [ -f server.js ] && [ ! -f package.json ] && [ "$START_CMD" = "npm start" ]; then
  exec node server.js
else
  exec /bin/sh -c "$START_CMD"
fi
