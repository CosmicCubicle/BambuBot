#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
CONFIG_FILE=${BAMBU_CONFIG_FILE:-"$SCRIPT_DIR/../hom.env"}
MODE=${1:-}

usage() {
	printf 'Usage: %s [--add | --logging | --streaming | --reset]\n' "$0"
}

get_value() {
	local line
	line=$(grep -m1 "^$1=" "$CONFIG_FILE" 2>/dev/null || true)
	printf '%s' "${line#*=}"
}

set_value() {
	local key=$1 value=$2
	node - "$CONFIG_FILE" "$key" "$value" <<'NODE'
const fs = require('node:fs');
const [file, key, value] = process.argv.slice(2);
const prefix = `${key}=`;
const lines = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/) : [];
const index = lines.findIndex((line) => line.startsWith(prefix));
if (index === -1) lines.push(`${prefix}${value}`);
else lines[index] = `${prefix}${value}`;
fs.writeFileSync(file, `${lines.filter((line, index) => line || index < lines.length - 1).join('\n')}\n`, { mode: 0o600 });
NODE
}

ask() {
	local prompt=$1 default=${2:-} value
	if [ -n "$default" ]; then
		read -r -p "$prompt [$default]: " value
		printf '%s' "${value:-$default}"
	else
		read -r -p "$prompt: " value
		printf '%s' "$value"
	fi
}

ask_required() {
	local prompt=$1 default=${2:-} value
	while :; do
		value=$(ask "$prompt" "$default")
		[ -n "$value" ] && { printf '%s' "$value"; return; }
		printf 'A value is required.\n' >&2
	done
}

ask_secret() {
	local prompt=$1 value
	while :; do
		read -r -s -p "$prompt: " value
		printf '\n'
		[ -n "$value" ] && { printf '%s' "$value"; return; }
		printf 'A value is required.\n' >&2
	done
}

confirm() {
	local reply
	read -r -p "$1 [y/N]: " reply
	[[ "$reply" =~ ^[Yy]([Ee][Ss])?$ ]]
}

configure_logging() {
	printf '\nDiscord command logging\n'
	if ! confirm 'Post command logs to Discord?'; then
		set_value LOG_CHANNEL_ID ''
		set_value LOG_CHANNEL_SUCCESS_ID ''
		set_value LOG_CHANNEL_ERROR_ID ''
		return
	fi

	if confirm 'Use one channel for both successful and failed commands?'; then
		set_value LOG_CHANNEL_ID "$(ask_required 'Shared log channel ID' "$(get_value LOG_CHANNEL_ID)")"
		set_value LOG_CHANNEL_SUCCESS_ID ''
		set_value LOG_CHANNEL_ERROR_ID ''
	else
		set_value LOG_CHANNEL_ID ''
		set_value LOG_CHANNEL_SUCCESS_ID "$(ask_required 'Success log channel ID' "$(get_value LOG_CHANNEL_SUCCESS_ID)")"
		set_value LOG_CHANNEL_ERROR_ID "$(ask_required 'Error log channel ID' "$(get_value LOG_CHANNEL_ERROR_ID)")"
	fi
}

configure_streaming() {
	printf '\nCamera streaming\n'
	if ! confirm 'Enable the MJPEG and RTSP camera relay?'; then
		set_value BAMBU_STREAM_HOST ''
		set_value BAMBU_STREAM_PORT ''
		set_value BAMBU_RTSP_PRINTER ''
		return
	fi

	set_value BAMBU_STREAM_HOST "$(ask_required 'LAN hostname or IP for this host' "$(get_value BAMBU_STREAM_HOST)")"
	set_value BAMBU_STREAM_PORT "$(ask_required 'MJPEG HTTP port' "$(get_value BAMBU_STREAM_PORT)")"
	printf 'The RTSP server listens on port 8554.\n'
	set_value BAMBU_RTSP_PRINTER "$(ask_required 'Configured printer name to relay over RTSP' "$(get_value BAMBU_RTSP_PRINTER)")"
}

add_printer() {
	printf '\nBambu Lab printer\n'
	local name host access_code serial_number current updated
	name=$(ask_required 'Printer name')
	host=$(ask_required 'Printer LAN IP or hostname')
	access_code=$(ask_secret 'Printer LAN access code')
	serial_number=$(ask_required 'Printer serial number')
	current=$(get_value BAMBU_PRINTERS)
	updated=$(node -e '
try {
	const printers = process.argv[1] ? JSON.parse(process.argv[1]) : [];
	const [name, host, accessCode, serialNumber] = process.argv.slice(2);
	if (!Array.isArray(printers)) throw new Error("BAMBU_PRINTERS must be an array.");
	if (printers.some((printer) => printer.name === name)) throw new Error(`A printer named ${name} already exists.`);
	printers.push({ name, host, accessCode, serialNumber });
	console.log(JSON.stringify(printers));
} catch (error) {
	console.error(error.message);
	process.exit(1);
}
' "$current" "$name" "$host" "$access_code" "$serial_number")
	set_value BAMBU_PRINTERS "$updated"
	printf 'Added %s.\n' "$name"
}

configure_base() {
	printf 'PariahBot first-run configuration\n'
	set_value DISCORD_TOKEN "$(ask_secret 'Discord bot token')"
	set_value CLIENT_ID "$(ask_required 'Discord application/client ID')"
	set_value GUILD_ID "$(ask 'Discord guild ID (leave blank for global commands)' "$(get_value GUILD_ID)")"
	configure_logging
	configure_streaming
}

restart_services() {
	if ! command -v systemctl >/dev/null 2>&1; then
		return
	fi

	if confirm 'Restart PariahBot services now?'; then
		sudo systemctl restart bambubot.service mediamtx.service
		if [ -n "$(get_value BAMBU_RTSP_PRINTER)" ] && [ -n "$(get_value BAMBU_STREAM_PORT)" ]; then
			sudo systemctl enable --now bambu-rtsp-relay.service
		else
			sudo systemctl disable --now bambu-rtsp-relay.service 2>/dev/null || true
		fi
	fi
}

is_first_run() {
	local token printers
	token=$(get_value DISCORD_TOKEN)
	printers=$(get_value BAMBU_PRINTERS)
	[ -z "$token" ] || [ "$token" = 'your-bot-token-here' ] || [[ "$printers" == *'your-lan-access-code'* ]]
}

mkdir -p "$(dirname "$CONFIG_FILE")"
touch "$CONFIG_FILE"
chmod 600 "$CONFIG_FILE"

case "$MODE" in
	'')
		if ! is_first_run; then
			printf 'Configuration already exists. Use --add, --logging, --streaming, or --reset.\n' >&2
			usage
			exit 1
		fi
		configure_base
		add_printer
		;;
	--add)
		add_printer
		;;
	--logging)
		configure_logging
		;;
	--streaming)
		configure_streaming
		;;
	--reset)
		if ! confirm "Erase all settings in $CONFIG_FILE and start over?"; then
			printf 'Reset cancelled.\n'
			exit 0
		fi
		: > "$CONFIG_FILE"
		configure_base
		add_printer
		;;
	-h|--help)
		usage
		exit 0
		;;
	*)
		usage >&2
		exit 1
		;;
esac

restart_services
printf 'Configuration saved to %s.\n' "$CONFIG_FILE"
