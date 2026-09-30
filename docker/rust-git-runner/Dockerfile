FROM rust:1.85-slim

ENV CARGO_HOME=/usr/local/cargo
ENV RUSTUP_HOME=/usr/local/rustup

# Install OS packages and tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    bash \
    build-essential \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && git config --global --add safe.directory "*" \
    && apt-get clean

WORKDIR /app

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
