#!/bin/sh
set -e

git config --global --add safe.directory "*" >/dev/null 2>&1 || true
cd /usr/share/nginx/html

GIT_BRANCH="${GIT_BRANCH:-main}"

if [ -n "$GIT_REPOSITORY_URL" ]; then
  AUTH_REPO_URL="$GIT_REPOSITORY_URL"
  if [ -n "$GITHUB_TOKEN" ]; then
    AUTH_REPO_URL=$(echo "$GIT_REPOSITORY_URL" | sed -E "s#https://#https://${GITHUB_TOKEN}@#")
  fi
  if [ ! -d .git ]; then
    echo "[Runner] Clonando repositório estático: $GIT_REPOSITORY_URL (branch: $GIT_BRANCH)..."
    git clone --branch "$GIT_BRANCH" "$AUTH_REPO_URL" .
  else
    echo "[Runner] Atualizando repositório estático (branch: $GIT_BRANCH)..."
    git remote set-url origin "$AUTH_REPO_URL"
    git fetch origin "$GIT_BRANCH"
    git checkout "$GIT_BRANCH"
    git pull origin "$GIT_BRANCH"
  fi
elif [ ! -f index.html ]; then
  echo '[Runner] Criando index.html demo...'
  cat << 'DEMO_EOF' > index.html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>ServApp Estático / SPA</title>
    <style>
        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
        .card { background: #1e293b; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); text-align: center; max-width: 500px; border: 1px solid #334155; }
        h1 { color: #38bdf8; margin-top: 0; }
        p { color: #94a3b8; line-height: 1.6; }
        .badge { display: inline-block; background: #0284c7; color: white; padding: 4px 12px; border-radius: 9999px; font-weight: bold; margin-bottom: 1rem; }
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">Online</div>
        <h1>ServApp Nginx Estático</h1>
        <p>Servidor web Nginx de alta performance ativo no Cosmos-Server / ZimaOS.</p>
    </div>
</body>
</html>
DEMO_EOF
fi

if [ -n "$BUILD_CMD" ]; then
  echo "[Runner] Executando: $BUILD_CMD"
  eval "$BUILD_CMD"
fi

echo "[Runner] Iniciando Nginx..."
exec nginx -g "daemon off;"
