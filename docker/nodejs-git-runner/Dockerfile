FROM node:24-alpine

# Install OS packages and tools
RUN apk add --no-cache \
    git \
    bash \
    curl \
    ca-certificates \
    build-base \
    python3 \
    && corepack enable \
    && git config --global --add safe.directory "*"

WORKDIR /app

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
