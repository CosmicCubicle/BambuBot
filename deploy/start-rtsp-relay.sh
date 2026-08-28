#!/usr/bin/env bash
set -euo pipefail

: "${BAMBU_RTSP_PRINTER:?Set BAMBU_RTSP_PRINTER in /opt/BambuBot/hom.env before enabling the RTSP relay.}"
: "${BAMBU_STREAM_PORT:?Set BAMBU_STREAM_PORT in /opt/BambuBot/hom.env before enabling the RTSP relay.}"

PRINTER_PATH=$(node -p 'encodeURIComponent(process.argv[1])' "$BAMBU_RTSP_PRINTER")

exec /usr/bin/ffmpeg -nostdin -loglevel warning -fflags nobuffer \
	-i "http://127.0.0.1:${BAMBU_STREAM_PORT}/stream/${PRINTER_PATH}.mjpeg" \
	-an -c:v libx264 -preset ultrafast -tune zerolatency \
	-f rtsp -rtsp_transport tcp "rtsp://127.0.0.1:8554/${PRINTER_PATH}"