#!/bin/sh
set -e

git config --global --add safe.directory "*" >/dev/null 2>&1 || true
cd /app

GIT_BRANCH="${GIT_BRANCH:-main}"
START_CMD="${START_CMD:-cargo run --release}"

if [ -n "$GIT_REPOSITORY_URL" ]; then
  AUTH_REPO_URL="$GIT_REPOSITORY_URL"
  if [ -n "$GITHUB_TOKEN" ]; then
    AUTH_REPO_URL=$(echo "$GIT_REPOSITORY_URL" | sed -E "s#https://#https://${GITHUB_TOKEN}@#")
  fi
  if [ ! -d .git ]; then
    echo "[Runner] Clonando repositório Rust: $GIT_REPOSITORY_URL (branch: $GIT_BRANCH)..."
    git clone --branch "$GIT_BRANCH" "$AUTH_REPO_URL" .
  else
    echo "[Runner] Atualizando repositório Rust (branch: $GIT_BRANCH)..."
    git remote set-url origin "$AUTH_REPO_URL"
    git fetch origin "$GIT_BRANCH"
    git checkout "$GIT_BRANCH"
    git pull origin "$GIT_BRANCH"
  fi
elif [ ! -f Cargo.toml ] && [ ! -f src/main.rs ]; then
  echo '[Runner] Criando aplicação Rust demo...'
  mkdir -p src
  cat << 'DEMO_EOF' > Cargo.toml
[package]
name = "rust-demo"
version = "0.1.0"
edition = "2021"

[dependencies]
DEMO_EOF

  cat << 'DEMO_EOF' > src/main.rs
use std::io::Write;
use std::net::TcpListener;
use std::env;

fn main() {
    let port = env::var("APP_PORT").unwrap_or_else(|_| env::var("PORT").unwrap_or_else(|_| "8080".to_string()));
    let addr = format!("0.0.0.0:{}", port);
    let listener = TcpListener::bind(&addr).unwrap();
    println!("Servidor Rust ouvindo na porta {}", port);

    for stream in listener.incoming() {
        if let Ok(mut stream) = stream {
            let body = r#"{"status":"online","runtime":"Rust 1.85","message":"ServApp Rust ativo no Cosmos-Server"}"#;
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{}",
                body.len(),
                body
            );
            let _ = stream.write_all(response.as_bytes());
        }
    }
}
DEMO_EOF
fi

if [ -n "$INSTALL_CMD" ]; then
  echo "[Runner] Executando: $INSTALL_CMD"
  eval "$INSTALL_CMD"
fi

if [ -n "$BUILD_CMD" ]; then
  echo "[Runner] Executando: $BUILD_CMD"
  eval "$BUILD_CMD"
fi

echo "[Runner] Iniciando serviço: $START_CMD"
exec /bin/sh -c "$START_CMD"
