# shellcheck shell=bash
# RustFS, the object storage (D12, answered 2026-09-30): one pinned binary, its own system user,
# a data directory, and a systemd unit on 127.0.0.1 alone. The console stays off; everything
# (S3, the admin API, /health) is one loopback port that nothing outside the host reaches.
#
# The binary is the release's x86_64 musl zip (statically linked, so no glibc dependency),
# pinned by version and by the SHA-256 GitHub publishes for it; the extracted binary's own hash
# is kept beside it and checked on every run.

RUSTFS_VERSION=1.0.0
RUSTFS_ZIP=rustfs-linux-x86_64-musl-v1.0.0.zip
RUSTFS_ZIP_SHA256=c30a95b76546f25122c9ca387090ddb30c391ca5605621b0d7c881703c0f21c8
RUSTFS_URL="https://github.com/rustfs/rustfs/releases/download/$RUSTFS_VERSION/$RUSTFS_ZIP"
RUSTFS_USER=indies-rustfs
RUSTFS_HOME=/var/lib/indies-rustfs
RUSTFS_DATA=$RUSTFS_HOME/data
RUSTFS_BIN_DIR=/opt/indies/rustfs-$RUSTFS_VERSION
RUSTFS_CONF=/etc/indies/rustfs
RUSTFS_UNIT=indies-rustfs.service
RUSTFS_CHANGED=0

rustfs_preflight() {
  check_port "$RUSTFS_PORT" "$RUSTFS_USER" "RustFS"
  [ "$(uname -m)" = x86_64 ] || fail "RustFS: the pinned build is x86_64; this host is $(uname -m)"
}

# fetch_verified URL SHA256 DEST — download once into the cache; refuse a wrong hash.
fetch_verified() {
  local url="$1" sum="$2" dest="$3"
  if [ -f "$dest" ] && [ "$(sha256sum "$dest" | cut -d' ' -f1)" = "$sum" ]; then return 0; fi
  curl -fsSL --proto '=https' -o "$dest.partial" "$url"
  if [ "$(sha256sum "$dest.partial" | cut -d' ' -f1)" != "$sum" ]; then
    rm -f "$dest.partial"
    echo "checksum mismatch for $url: refused" >&2
    return 1
  fi
  mv "$dest.partial" "$dest"
}

install_rustfs_binary() {
  local zip=/var/cache/indies/$RUSTFS_ZIP tmp
  install -d -m 755 /var/cache/indies "$RUSTFS_BIN_DIR"
  fetch_verified "$RUSTFS_URL" "$RUSTFS_ZIP_SHA256" "$zip"
  tmp="$(mktemp -d)"
  python3 -c 'import sys, zipfile; zipfile.ZipFile(sys.argv[1]).extract("rustfs", sys.argv[2])' "$zip" "$tmp"
  install -m 755 -o root -g root "$tmp/rustfs" "$RUSTFS_BIN_DIR/rustfs"
  rm -rf "$tmp"
  "$RUSTFS_BIN_DIR/rustfs" --version | head -n 1 | grep -q "rustfs $RUSTFS_VERSION"
  sha256sum "$RUSTFS_BIN_DIR/rustfs" | cut -d' ' -f1 >"$RUSTFS_BIN_DIR/rustfs.sha256"
}

rustfs_binary_ok() {
  [ -x "$RUSTFS_BIN_DIR/rustfs" ] && [ -f "$RUSTFS_BIN_DIR/rustfs.sha256" ] &&
    [ "$(sha256sum "$RUSTFS_BIN_DIR/rustfs" | cut -d' ' -f1)" = "$(cat "$RUSTFS_BIN_DIR/rustfs.sha256")" ]
}

# The root credentials are made on the host, once, into root-only files RustFS reads itself
# (RUSTFS_*_KEY_FILE): never in the repo, the unit, the environment or a log. Only this script's
# admin calls use them; each site gets its own scoped key (s3admin.sh).
write_root_credentials() (
  umask 077
  # 18 and 40 characters: inside the S3 limits (an access key of at most 20, a secret of 40).
  printf 'indies%s' "$(head -c 6 /dev/urandom | od -An -tx1 | tr -d ' \n')" >"$RUSTFS_CONF/access-key"
  head -c 20 /dev/urandom | od -An -tx1 | tr -d ' \n' >"$RUSTFS_CONF/secret-key"
  chown "root:$RUSTFS_USER" "$RUSTFS_CONF/access-key" "$RUSTFS_CONF/secret-key"
  chmod 640 "$RUSTFS_CONF/access-key" "$RUSTFS_CONF/secret-key"
)

rustfs_unit() {
  cat <<INI
# RustFS $RUSTFS_VERSION for the Indies sites (scripts/ops/helios-provision.sh; D12).
# Loopback only: S3, the admin API and /health on 127.0.0.1:$RUSTFS_PORT; the console is off.
[Unit]
Description=RustFS object storage for the Indies sites (127.0.0.1:$RUSTFS_PORT)
After=network-online.target
Wants=network-online.target

[Service]
User=$RUSTFS_USER
Group=$RUSTFS_USER
Environment=RUSTFS_ADDRESS=127.0.0.1:$RUSTFS_PORT
Environment=RUSTFS_VOLUMES=$RUSTFS_DATA
Environment=RUSTFS_ACCESS_KEY_FILE=$RUSTFS_CONF/access-key
Environment=RUSTFS_SECRET_KEY_FILE=$RUSTFS_CONF/secret-key
Environment=RUSTFS_CONSOLE_ENABLE=false
ExecStart=$RUSTFS_BIN_DIR/rustfs server
Restart=on-failure
RestartSec=5
LimitNOFILE=65536
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$RUSTFS_HOME

[Install]
WantedBy=multi-user.target
INI
}

ensure_rustfs() {
  say "RustFS $RUSTFS_VERSION on 127.0.0.1:$RUSTFS_PORT (data $RUSTFS_DATA)"
  ensure_dir /etc/indies 755 root:root
  ensure_system_user "$RUSTFS_USER" "$RUSTFS_HOME"
  ensure_dir /opt/indies 755 root:root
  if rustfs_binary_ok; then
    ok "$RUSTFS_BIN_DIR/rustfs matches its recorded SHA-256"
  else
    act "download $RUSTFS_ZIP (SHA-256 $RUSTFS_ZIP_SHA256) and install $RUSTFS_BIN_DIR/rustfs" \
      install_rustfs_binary
    RUSTFS_CHANGED=1
  fi
  if dry && ! id -u "$RUSTFS_USER" >/dev/null 2>&1; then
    act "create $RUSTFS_HOME, $RUSTFS_DATA (700 $RUSTFS_USER) and $RUSTFS_CONF (750 root:$RUSTFS_USER)" true
  else
    ensure_dir "$RUSTFS_HOME" 750 "$RUSTFS_USER:$RUSTFS_USER"
    ensure_dir "$RUSTFS_DATA" 700 "$RUSTFS_USER:$RUSTFS_USER"
    ensure_dir "$RUSTFS_CONF" 750 "root:$RUSTFS_USER"
  fi
  if [ -s "$RUSTFS_CONF/access-key" ] && [ -s "$RUSTFS_CONF/secret-key" ]; then
    ok "RustFS root credentials exist in $RUSTFS_CONF (640 root:$RUSTFS_USER; never printed)"
  else
    act "generate RustFS root credentials into $RUSTFS_CONF/{access-key,secret-key} (never printed)" \
      write_root_credentials
    RUSTFS_CHANGED=1
  fi
  PUT_CHANGED=0
  rustfs_unit | put_file "/etc/systemd/system/$RUSTFS_UNIT" 644 root:root
  if [ "$PUT_CHANGED" = 1 ]; then
    UNITS_CHANGED=1
    RUSTFS_CHANGED=1
  fi
  daemon_reload_if_needed
  if dry && [ "$RUSTFS_CHANGED" = 1 ]; then
    act "enable and (re)start $RUSTFS_UNIT, then wait for http://127.0.0.1:$RUSTFS_PORT/health" true
    return 0
  fi
  ensure_enabled_active "$RUSTFS_UNIT" "$RUSTFS_CHANGED"
  wait_rustfs_health
}

wait_rustfs_health() {
  local _
  for _ in $(seq 1 30); do
    if [ "$(curl -s -o /dev/null -w '%{http_code}' -m 2 "http://127.0.0.1:$RUSTFS_PORT/health")" = 200 ]; then
      ok "RustFS answers http://127.0.0.1:$RUSTFS_PORT/health"
      return 0
    fi
    dry && break
    sleep 1
  done
  if dry; then note "RustFS does not answer yet"; else fail "RustFS did not answer /health within 30 s (journalctl -u $RUSTFS_UNIT)"; fi
}
