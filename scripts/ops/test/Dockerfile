# A throwaway stand-in for Helios, to test helios-provision.sh locally: Debian with Postgres 18
# from PGDG (Helios runs 18.6 from PGDG), cron, ss, logrotate and e2fsprogs, the site users
# CloudPanel would have made, their vhosts, and shims for systemctl and pm2 (no systemd in a
# container). Never pushed anywhere; built and run (privileged, for the loop mount) by
# scripts/ops/test/container-test.sh.
FROM node:22.13.0-bookworm
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ca-certificates curl gnupg \
 && install -d /usr/share/postgresql-common/pgdg \
 && curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
 && echo 'deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main' >/etc/apt/sources.list.d/pgdg.list \
 && apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      postgresql-18 cron iproute2 logrotate procps python3 e2fsprogs util-linux openssl \
 && rm -rf /var/lib/apt/lists/*
COPY shims/systemctl shims/pm2 /usr/local/bin/
RUN chmod 755 /usr/local/bin/systemctl /usr/local/bin/pm2 \
 && useradd -m -s /bin/bash uig && useradd -m -s /bin/bash uoei \
 && mkdir -p /etc/nginx/sites-enabled /etc/systemd/system \
 && printf 'server {\n  location / {\n    proxy_pass http://127.0.0.1:4030;\n  }\n}\n' >/etc/nginx/sites-enabled/ig.gaiada.com.conf \
 && printf 'server {\n  location / {\n    proxy_pass http://127.0.0.1:4031;\n  }\n}\n' >/etc/nginx/sites-enabled/oei.gaiada.com.conf \
 && printf '#!/bin/sh\nexit 0\n' >/home/uig/prune-releases.sh && chmod 755 /home/uig/prune-releases.sh && chown uig:uig /home/uig/prune-releases.sh
