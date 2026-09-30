FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1

# Install OS packages and tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    bash \
    build-essential \
    ca-certificates \
    && git config --global --add safe.directory "*" \
    && apt-get clean

WORKDIR /app

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
