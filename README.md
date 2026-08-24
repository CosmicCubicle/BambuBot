# PariahBot

A Discord bot built with [discord.js](https://discord.js.org/).

## Setup

1. Copy `.env.example` to `.env` and fill in your bot's `DISCORD_TOKEN`, `CLIENT_ID`, and (optionally, for instant testing) `GUILD_ID`.
2. Install dependencies: `npm install`
3. Register slash commands: `npm run deploy`
4. Start the bot: `npm start` (or `npm run dev` for auto-restart during development)

## Project structure

- `index.js` — bot entry point, loads commands and events
- `deploy-commands.js` — registers slash commands with Discord
- `commands/` — one file per slash command
- `events/` — one file per Discord.js client event
