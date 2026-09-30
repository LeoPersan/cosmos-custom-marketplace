FROM golang:1.24-alpine

# Install OS packages and tools
RUN apk add --no-cache \
    git \
    bash \
    curl \
    build-base \
    ca-certificates \
    && git config --global --add safe.directory "*"

WORKDIR /app

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
