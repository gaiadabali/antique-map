# A throwaway stand-in for Helios, to test helios-provision.sh locally: Debian with Postgres,
# cron, ss and logrotate, the site users CloudPanel would have made, their vhosts, and shims
# for systemctl and pm2 (no systemd in a container). Never pushed anywhere; built and run by
# scripts/ops/test/container-test.sh.
FROM node:22.13.0-bookworm
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      postgresql cron iproute2 logrotate procps python3 \
 && rm -rf /var/lib/apt/lists/*
COPY shims/systemctl shims/pm2 /usr/local/bin/
RUN chmod 755 /usr/local/bin/systemctl /usr/local/bin/pm2 \
 && useradd -m -s /bin/bash uig && useradd -m -s /bin/bash uoei \
 && mkdir -p /etc/nginx/sites-enabled /etc/systemd/system \
 && printf 'server {\n  location / {\n    proxy_pass http://127.0.0.1:4030;\n  }\n}\n' >/etc/nginx/sites-enabled/ig.gaiada.com.conf \
 && printf 'server {\n  location / {\n    proxy_pass http://127.0.0.1:4031;\n  }\n}\n' >/etc/nginx/sites-enabled/oei.gaiada.com.conf \
 && printf '#!/bin/sh\nexit 0\n' >/home/uig/prune-releases.sh && chmod 755 /home/uig/prune-releases.sh && chown uig:uig /home/uig/prune-releases.sh
