FROM nginx:alpine

# Install OS packages and tools
RUN apk add --no-cache \
    git \
    bash \
    curl \
    ca-certificates \
    && git config --global --add safe.directory "*"

COPY default.conf /etc/nginx/conf.d/default.conf

WORKDIR /usr/share/nginx/html

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
