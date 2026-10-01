# A throwaway stand-in for Helios, to test helios-provision.sh locally: Debian with Postgres 18
# from PGDG (Helios runs 18.6 from PGDG), cron, ss, logrotate and e2fsprogs, and shims for
# systemctl, pm2, npm and clpctl (no systemd or CloudPanel in a container). It starts as Helios
# was before the first run: CloudPanel's sites ig.gaiada.com (uig) and oei.gaiada.com (uoei),
# each user with an nvm node and npm but no pm2, and the system pm2 7.0.1 at /usr/bin/pm2 ->
# /usr/lib/node_modules/pm2, root:root 775 with no member in group root, as on Helios. Never pushed anywhere; built
# and run (privileged, for the loop mount) by scripts/ops/test/container-test.sh.
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
COPY shims/systemctl shims/clpctl /usr/local/bin/
COPY shims/pm2 shims/npm shims/make-nvm /opt/shim/
RUN chmod 755 /usr/local/bin/systemctl /usr/local/bin/clpctl /opt/shim/pm2 /opt/shim/npm /opt/shim/make-nvm \
 && install -d -m 775 /usr/lib/node_modules/pm2 /usr/lib/node_modules/pm2/bin \
 && install -m 775 /opt/shim/pm2 /usr/lib/node_modules/pm2/bin/pm2 \
 && printf '{"name":"pm2","version":"7.0.1"}\n' >/usr/lib/node_modules/pm2/package.json \
 && ln -s ../lib/node_modules/pm2/bin/pm2 /usr/bin/pm2 && ln -s /usr/local/bin/node /usr/bin/node \
 && install -m 666 /dev/null /tmp/npm-shim.log \
 && mkdir -p /etc/nginx/sites-enabled /etc/systemd/system \
 && clpctl site:add:nodejs --domainName=ig.gaiada.com --nodejsVersion=22 --appPort=4030 --siteUser=uig --siteUserPassword=x \
 && clpctl site:add:nodejs --domainName=oei.gaiada.com --nodejsVersion=22 --appPort=4031 --siteUser=uoei --siteUserPassword=x \
 && : >/var/log/clpctl-shim.log
