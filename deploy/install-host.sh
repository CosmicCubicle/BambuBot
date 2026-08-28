#!/usr/bin/env bash
set -euo pipefail

if [ "${EUID}" -ne 0 ]; then
	printf 'Run with sudo: sudo ./deploy/install-host.sh\n' >&2
	exit 1
fi

REPO_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
BOT_USER=${SUDO_USER:-}
if [ -z "$BOT_USER" ] || [ "$BOT_USER" = "root" ]; then
	printf 'Run this with sudo from the intended non-root user account.\n' >&2
	exit 1
fi

BOT_HOME=$(getent passwd "$BOT_USER" | cut -d: -f6)
INSTALL_DIR=/opt/BambuBot
MEDIAMTX_VERSION=1.20.1

case "$(uname -m)" in
	aarch64|arm64) MEDIAMTX_ARCH=arm64 ;;
	x86_64|amd64) MEDIAMTX_ARCH=amd64 ;;
	*) printf 'Unsupported MediaMTX architecture.\n' >&2; exit 1 ;;
esac

for command in git curl ffmpeg; do
	if ! command -v "$command" >/dev/null 2>&1; then
		apt-get update
		apt-get install -y "$command"
	fi
done

if [ ! -d "$INSTALL_DIR/.git" ]; then
	mkdir -p "$INSTALL_DIR"
	cp -a "$REPO_DIR/." "$INSTALL_DIR/"
	chown -R "$BOT_USER:$BOT_USER" "$INSTALL_DIR"
else
	git -C "$INSTALL_DIR" pull --ff-only
fi

if [ ! -f "$INSTALL_DIR/hom.env" ]; then
	cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/hom.env"
	chown "$BOT_USER:$BOT_USER" "$INSTALL_DIR/hom.env"
	chmod 600 "$INSTALL_DIR/hom.env"
	printf 'Created %s; configure its secrets before starting the bot.\n' "$INSTALL_DIR/hom.env"
fi

sudo -u "$BOT_USER" HOME="$BOT_HOME" bash -lc '
	export NVM_DIR="$HOME/.nvm"
	if [ ! -s "$NVM_DIR/nvm.sh" ]; then
		curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
	fi
	. "$NVM_DIR/nvm.sh"
	nvm install 20
	nvm alias default 20
	cd /opt/BambuBot
	npm ci --omit=dev
'

if [ ! -x /opt/mediamtx/mediamtx ]; then
	mkdir -p /opt/mediamtx
	curl -fsSL "https://github.com/bluenviron/mediamtx/releases/download/v${MEDIAMTX_VERSION}/mediamtx_v${MEDIAMTX_VERSION}_linux_${MEDIAMTX_ARCH}.tar.gz" | tar -xz -C /opt/mediamtx
	chown -R "$BOT_USER:$BOT_USER" /opt/mediamtx
fi

install -m 644 "$INSTALL_DIR/deploy/mediamtx.yml" /opt/mediamtx/mediamtx.yml
sed "s/^User=cosmic$/User=$BOT_USER/" "$INSTALL_DIR/deploy/bambubot.service" > /etc/systemd/system/bambubot.service
sed "s/^User=cosmic$/User=$BOT_USER/" "$INSTALL_DIR/deploy/mediamtx.service" > /etc/systemd/system/mediamtx.service
sed "s/^User=cosmic$/User=$BOT_USER/" "$INSTALL_DIR/deploy/bambu-rtsp-relay.service" > /etc/systemd/system/bambu-rtsp-relay.service
chmod 644 /etc/systemd/system/bambubot.service /etc/systemd/system/mediamtx.service /etc/systemd/system/bambu-rtsp-relay.service
chmod 755 "$INSTALL_DIR/deploy/start-rtsp-relay.sh"
chmod 755 "$INSTALL_DIR/deploy/sync-bambubot.sh"

systemctl daemon-reload
systemctl enable mediamtx.service bambubot.service
(crontab -u "$BOT_USER" -l 2>/dev/null | grep -v 'sync-bambubot.sh' || true; echo '0,15,30,45 * * * * /opt/BambuBot/deploy/sync-bambubot.sh') | crontab -u "$BOT_USER" -

if ! grep -q '^DISCORD_TOKEN=your-bot-token-here$' "$INSTALL_DIR/hom.env"; then
	systemctl restart mediamtx.service bambubot.service
	if grep -q '^BAMBU_RTSP_PRINTER=.' "$INSTALL_DIR/hom.env" && grep -q '^BAMBU_STREAM_PORT=.' "$INSTALL_DIR/hom.env"; then
		systemctl enable --now bambu-rtsp-relay.service
	else
		systemctl disable --now bambu-rtsp-relay.service 2>/dev/null || true
	fi
fi

printf 'Installation complete. Configure %s, then run: sudo systemctl restart bambubot.service\n' "$INSTALL_DIR/hom.env"