#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PUSH=false
NO_CACHE=false
RUNNERS=("nodejs-git-runner" "python-git-runner" "golang-git-runner" "php-laravel-runner" "rust-git-runner" "static-nginx-runner")
TARGET_RUNNER=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --push)
      PUSH=true
      shift
      ;;
    --no-cache)
      NO_CACHE=true
      shift
      ;;
    --runner)
      TARGET_RUNNER="$2"
      shift 2
      ;;
    *)
      echo "Uso: $0 [--push] [--no-cache] [--runner <nome-do-runner>]"
      exit 1
      ;;
  esac
done

if [ -n "$TARGET_RUNNER" ]; then
  RUNNERS=("$TARGET_RUNNER")
fi

echo "=========================================================="
echo " 🐳 Compilação Multi-Arquitetura das Imagens dos Runners"
echo " Organização/Namespace: leopersan"
echo " Plataformas: linux/amd64,linux/arm64"
echo " Push para Docker Hub: $PUSH"
echo "=========================================================="

cd "$REPO_ROOT"

for runner in "${RUNNERS[@]}"; do
  IMAGE_TAG="leopersan/$runner:latest"
  CONTEXT_DIR="docker/$runner"

  if [ ! -d "$CONTEXT_DIR" ]; then
    echo "❌ Erro: Diretório $CONTEXT_DIR não encontrado!"
    exit 1
  fi

  echo ""
  echo "🔨 Compilando imagem: $IMAGE_TAG a partir de $CONTEXT_DIR..."

  BUILD_ARGS=(
    "buildx" "build"
    "--platform" "linux/amd64,linux/arm64"
    "-t" "$IMAGE_TAG"
    "-f" "$CONTEXT_DIR/Dockerfile"
    "$CONTEXT_DIR"
  )

  if [ "$NO_CACHE" = true ]; then
    BUILD_ARGS+=("--no-cache")
  fi

  if [ "$PUSH" = true ]; then
    BUILD_ARGS+=("--push")
  else
    BUILD_ARGS+=("--load")
  fi

  if [ "$PUSH" = false ]; then
    # Para teste local sem push, docker buildx load suporta apenas uma arquitetura por vez
    echo "ℹ️ Modo local: Compilando para arquitetura nativa do host..."
    docker build -t "$IMAGE_TAG" -f "$CONTEXT_DIR/Dockerfile" "$CONTEXT_DIR"
  else
    docker "${BUILD_ARGS[@]}"
  fi

  echo "✅ $IMAGE_TAG pronto!"
done

echo ""
echo "🎉 Todas as imagens foram processadas com sucesso!"
