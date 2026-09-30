#!/bin/sh
set -e

git config --global --add safe.directory "*" >/dev/null 2>&1 || true
cd /app

GIT_BRANCH="${GIT_BRANCH:-main}"
START_CMD="${START_CMD:-/app/.venv/bin/python main.py}"

if [ ! -d /app/.venv ]; then
  python3 -m venv /app/.venv
  /app/.venv/bin/pip install --upgrade pip >/dev/null 2>&1 || true
fi

if [ -n "$GIT_REPOSITORY_URL" ]; then
  AUTH_REPO_URL="$GIT_REPOSITORY_URL"
  if [ -n "$GITHUB_TOKEN" ]; then
    AUTH_REPO_URL=$(echo "$GIT_REPOSITORY_URL" | sed -E "s#https://#https://${GITHUB_TOKEN}@#")
  fi
  if [ ! -d .git ]; then
    echo "[Runner] Clonando repositório Python: $GIT_REPOSITORY_URL (branch: $GIT_BRANCH)..."
    git clone --branch "$GIT_BRANCH" "$AUTH_REPO_URL" .
  else
    echo "[Runner] Atualizando repositório Python (branch: $GIT_BRANCH)..."
    git remote set-url origin "$AUTH_REPO_URL"
    git fetch origin "$GIT_BRANCH"
    git checkout "$GIT_BRANCH"
    git pull origin "$GIT_BRANCH"
  fi
elif [ ! -f main.py ] && [ ! -f app.py ]; then
  echo '[Runner] Criando aplicação Python demo...'
  cat << 'DEMO_EOF' > main.py
import http.server
import socketserver
import json
import os

PORT = int(os.environ.get('APP_PORT', os.environ.get('PORT', 8000)))

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = {'status': 'online', 'runtime': 'Python 3.13', 'message': 'ServApp Python ativo no Cosmos-Server'}
        self.wfile.write(json.dumps(response).encode('utf-8'))

with socketserver.TCPServer(('', PORT), Handler) as httpd:
    print(f'Servidor Python ouvindo na porta {PORT}')
    httpd.serve_forever()
DEMO_EOF
fi

if [ -f requirements.txt ]; then
  INSTALL_CMD="${INSTALL_CMD:-/app/.venv/bin/pip install --no-cache-dir -r requirements.txt}"
  echo "[Runner] Executando: $INSTALL_CMD"
  eval "$INSTALL_CMD"
fi

if [ -n "$BUILD_CMD" ]; then
  echo "[Runner] Executando: $BUILD_CMD"
  eval "$BUILD_CMD"
fi

echo "[Runner] Iniciando serviço: $START_CMD"
exec /bin/sh -c "$START_CMD"
