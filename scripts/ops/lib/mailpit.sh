# shellcheck shell=bash
# Mailpit, staging's mail catcher (D13, answered 2026-09-30): staging sends no real mail. Every
# message the apps send to 127.0.0.1:<smtp> is kept, and read in Mailpit's UI through an SSH
# tunnel to 127.0.0.1:<ui>. Both ports are loopback only; nothing is ever relayed onwards (no
# relay configuration exists, and none may be added). Production does not run it.
#
# Pinned to the version docker-compose.dev.yml runs, by the SHA-256 GitHub publishes for it.

MAILPIT_VERSION=1.31.3
MAILPIT_TGZ=mailpit-linux-amd64.tar.gz
MAILPIT_TGZ_SHA256=e98b9a8d9622417a6988b736f7d3246e94bad4fed48ad3c604e60d72569f8cc7
MAILPIT_URL="https://github.com/axllent/mailpit/releases/download/v$MAILPIT_VERSION/$MAILPIT_TGZ"
MAILPIT_USER=indies-mailpit
MAILPIT_HOME=/var/lib/indies-mailpit
MAILPIT_BIN_DIR=/opt/indies/mailpit-$MAILPIT_VERSION
MAILPIT_UNIT=indies-mailpit.service

mailpit_wanted() { [ "$ENVIRONMENT" = staging ]; }

mailpit_preflight() {
  mailpit_wanted || return 0
  check_port "$MAILPIT_SMTP_PORT" "$MAILPIT_USER" "Mailpit SMTP"
  check_port "$MAILPIT_UI_PORT" "$MAILPIT_USER" "Mailpit UI"
}

install_mailpit_binary() {
  local tgz=/var/cache/indies/mailpit-$MAILPIT_VERSION-linux-amd64.tar.gz tmp
  install -d -m 755 /var/cache/indies "$MAILPIT_BIN_DIR"
  fetch_verified "$MAILPIT_URL" "$MAILPIT_TGZ_SHA256" "$tgz"
  tmp="$(mktemp -d)"
  tar -xzf "$tgz" -C "$tmp" mailpit
  install -m 755 -o root -g root "$tmp/mailpit" "$MAILPIT_BIN_DIR/mailpit"
  rm -rf "$tmp"
  sha256sum "$MAILPIT_BIN_DIR/mailpit" | cut -d' ' -f1 >"$MAILPIT_BIN_DIR/mailpit.sha256"
}

mailpit_binary_ok() {
  [ -x "$MAILPIT_BIN_DIR/mailpit" ] && [ -f "$MAILPIT_BIN_DIR/mailpit.sha256" ] &&
    [ "$(sha256sum "$MAILPIT_BIN_DIR/mailpit" | cut -d' ' -f1)" = "$(cat "$MAILPIT_BIN_DIR/mailpit.sha256")" ]
}

mailpit_unit() {
  cat <<INI
# Mailpit $MAILPIT_VERSION: staging's mail catcher (scripts/ops/helios-provision.sh; D13).
# SMTP on 127.0.0.1:$MAILPIT_SMTP_PORT, UI on 127.0.0.1:$MAILPIT_UI_PORT; nothing is relayed.
[Unit]
Description=Mailpit mail catcher for the Indies staging sites (loopback only)
After=network-online.target

[Service]
User=$MAILPIT_USER
Group=$MAILPIT_USER
ExecStart=$MAILPIT_BIN_DIR/mailpit --smtp 127.0.0.1:$MAILPIT_SMTP_PORT --listen 127.0.0.1:$MAILPIT_UI_PORT --database $MAILPIT_HOME/mailpit.db --max 5000 --max-age 30d --smtp-auth-accept-any --smtp-auth-allow-insecure --disable-version-check
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$MAILPIT_HOME

[Install]
WantedBy=multi-user.target
INI
}

ensure_mailpit() {
  mailpit_wanted || return 0
  say "Mailpit $MAILPIT_VERSION: SMTP 127.0.0.1:$MAILPIT_SMTP_PORT, UI 127.0.0.1:$MAILPIT_UI_PORT"
  local changed=0
  ensure_system_user "$MAILPIT_USER" "$MAILPIT_HOME"
  if dry && ! id -u "$MAILPIT_USER" >/dev/null 2>&1; then
    act "create $MAILPIT_HOME (750 $MAILPIT_USER)" true
  else
    ensure_dir "$MAILPIT_HOME" 750 "$MAILPIT_USER:$MAILPIT_USER"
  fi
  if mailpit_binary_ok; then
    ok "$MAILPIT_BIN_DIR/mailpit matches its recorded SHA-256"
  else
    act "download $MAILPIT_TGZ v$MAILPIT_VERSION (SHA-256 $MAILPIT_TGZ_SHA256) and install $MAILPIT_BIN_DIR/mailpit" \
      install_mailpit_binary
    changed=1
  fi
  PUT_CHANGED=0
  mailpit_unit | put_file "/etc/systemd/system/$MAILPIT_UNIT" 644 root:root
  if [ "$PUT_CHANGED" = 1 ]; then
    UNITS_CHANGED=1
    changed=1
  fi
  daemon_reload_if_needed
  if dry && [ "$changed" = 1 ]; then
    act "enable and (re)start $MAILPIT_UNIT" true
  else
    ensure_enabled_active "$MAILPIT_UNIT" "$changed"
  fi
}
