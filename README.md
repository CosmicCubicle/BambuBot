# PariahBot

A Discord bot built with [discord.js](https://discord.js.org/).

## Setup

1. Fill in `hom.env` with your bot's `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`, and Bambu LAN settings.
2. Install dependencies: `npm install`
3. Register slash commands: `npm run deploy`
4. Start the bot: `npm start` (or `npm run dev` for auto-restart during development)

## Project structure

- `index.js` — bot entry point, loads commands and events
- `deploy-commands.js` — registers slash commands with Discord
- `commands/` — one file per slash command
- `events/` — one file per Discord.js client event
- `bambu/` — Bambu Lab LAN connection, notifications, and controls

## Bambu Lab print notifications

The bot can post print status updates and send controls by connecting directly to printers in
local LAN mode over MQTT. The bot must be running on the same network as the printers.

1. In `.env`, set `BAMBU_PRINTERS` to a JSON array. Each entry needs a unique `name`, the printer
   `host` IP address, its LAN `accessCode`, and `serialNumber`. Example:
   `[{"name":"X1 Carbon","host":"192.168.1.50","accessCode":"...","serialNumber":"..."},{"name":"A1 Mini","host":"192.168.1.51","accessCode":"...","serialNumber":"..."}]`
2. Start the bot, then in each server run `/bambu-channel set` and pick a channel to receive
   notifications. Use `/bambu-status` to check the printer's current state on demand.
3. Use `/bambu-control` to pause, resume, stop (with `confirm_stop: True`), change print speed,
   or toggle the chamber light. These controls require the Discord member to have Manage Server.

The LAN access codes are only used to authenticate directly to the configured printers. Keep `.env`
private.
