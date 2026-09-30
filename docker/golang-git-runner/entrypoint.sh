#!/bin/sh
set -e

git config --global --add safe.directory "*" >/dev/null 2>&1 || true
mkdir -p /app/bin
cd /app

GIT_BRANCH="${GIT_BRANCH:-main}"
START_CMD="${START_CMD:-/app/bin/server}"

if [ -n "$GIT_REPOSITORY_URL" ]; then
  AUTH_REPO_URL="$GIT_REPOSITORY_URL"
  if [ -n "$GITHUB_TOKEN" ]; then
    AUTH_REPO_URL=$(echo "$GIT_REPOSITORY_URL" | sed -E "s#https://#https://${GITHUB_TOKEN}@#")
  fi
  if [ ! -d .git ]; then
    echo "[Runner] Clonando repositório Go: $GIT_REPOSITORY_URL (branch: $GIT_BRANCH)..."
    git clone --branch "$GIT_BRANCH" "$AUTH_REPO_URL" .
  else
    echo "[Runner] Atualizando repositório Go (branch: $GIT_BRANCH)..."
    git remote set-url origin "$AUTH_REPO_URL"
    git fetch origin "$GIT_BRANCH"
    git checkout "$GIT_BRANCH"
    git pull origin "$GIT_BRANCH"
  fi
elif [ ! -f main.go ] && [ ! -f go.mod ]; then
  echo '[Runner] Criando aplicação Go demo...'
  cat << 'DEMO_EOF' > main.go
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

func main() {
	port := os.Getenv("APP_PORT")
	if port == "" {
		port = os.Getenv("PORT")
	}
	if port == "" {
		port = "8080"
	}
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "online",
			"runtime": "Go 1.24",
			"message": "ServApp Go ativo no Cosmos-Server",
		})
	})
	fmt.Printf("Servidor Go ouvindo na porta %s\n", port)
	http.ListenAndServe(":"+port, nil)
}
DEMO_EOF
fi

if [ -f go.mod ]; then
  INSTALL_CMD="${INSTALL_CMD:-go mod download}"
  echo "[Runner] Executando: $INSTALL_CMD"
  eval "$INSTALL_CMD"
fi

if [ -n "$BUILD_CMD" ]; then
  echo "[Runner] Executando: $BUILD_CMD"
  eval "$BUILD_CMD"
elif [ -f main.go ] && [ ! -f /app/bin/server ]; then
  echo "[Runner] Compilando binário: go build -o /app/bin/server main.go"
  go build -o /app/bin/server main.go || true
fi

echo "[Runner] Iniciando serviço: $START_CMD"
if [ -f /app/bin/server ] && [ "$START_CMD" = "/app/bin/server" ]; then
  exec /app/bin/server
elif [ -f main.go ] && [ ! -f /app/bin/server ]; then
  exec go run main.go
else
  exec /bin/sh -c "$START_CMD"
fi
