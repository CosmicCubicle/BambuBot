# PariahBot

PariahBot is a Discord bot for monitoring and controlling Bambu Lab printers on a local network. It provides live printer status, safe print controls, camera snapshots, optional LAN video relays, state notifications, and command audit logs.

## Features

- Direct Bambu Lab LAN MQTT connection with automatic reconnects.
- Printer state-change notifications to a Discord channel, with an optional user mention.
- Status for one printer or all configured printers.
- Print controls: pause, resume, confirmed stop, speed selection, chamber light controls, and confirmed homing.
- AMS load controls and AMS slot material/color metadata updates.
- Printer-camera snapshots for one or every configured printer.
- LAN-only MJPEG camera relay and optional RTSP output via FFmpeg and MediaMTX.
- Human-readable command audit log at `logs/commands.log`.
- Optional Discord channels for successful and failed command logs.
- Dynamic `/help` generated from the registered commands.
- Quarter-hour GitHub sync deployment that pulls `master`, refreshes dependencies/commands, and restarts the bot when code changes.

## Requirements

- A Linux host using `systemd`, on the same LAN as the printers.
- `sudo` access on that host and access to this GitHub repository.
- A Discord application with a bot token and application ID; a guild ID is optional but makes command registration immediate for that guild.
- Each Bambu printer in LAN mode, with its IP address, LAN access code, and serial number.
- Internet access during install. The installer adds missing `git`, `curl`, and `ffmpeg` through `apt`, installs Node.js 20 with `nvm`, and downloads MediaMTX.

## Discord Application Setup

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and select **New Application**. Give it a name, then select **Create**.
2. On **General Information**, copy **Application ID**. This is the `CLIENT_ID` requested by onboarding.
3. Open **Bot** in the sidebar, select **Add Bot**, then use **Reset Token** to reveal and copy the token. This is the `DISCORD_TOKEN` requested by onboarding. Store it only in `hom.env`; never commit it, publish it, or send it in chat.
4. In **Installation**, add the `bot` and `applications.commands` scopes under **Guild Install**. Under **Permissions**, select at least **View Channels**, **Send Messages**, **Embed Links**, **Attach Files**, and **Read Message History**. Copy the generated install URL, open it in a browser, and add the bot to the target Discord server.
5. Enable Discord **Developer Mode**: Discord User Settings → Advanced → Developer Mode. Right-click the target server and choose **Copy Server ID**. This is the optional `GUILD_ID` value. Set it to register slash commands immediately in that server; leave it blank to register globally, which Discord can take up to one hour to propagate.

This bot only requests the Guilds gateway intent, so no privileged gateway intents need to be enabled in the Developer Portal.

## Host Installation

Clone this repository, then run the installer from its root as the non-root account that will own and run the bot:

```bash
git clone https://github.com/CosmicCubicle/BambuBot.git
cd BambuBot
sudo ./deploy/install-host.sh
```

The installer installs the application to `/opt/BambuBot`, creates `hom.env` from `.env.example` when it does not exist, installs Node.js and production dependencies, installs MediaMTX, installs systemd units, and creates a GitHub sync cron job at minutes `0`, `15`, `30`, and `45`.

Run the onboarding prompt after installation:

```bash
/opt/BambuBot/deploy/onboard.sh
```

Later, use `--add` to add a printer, `--logging` to configure Discord command log channels, `--streaming` to configure the MJPEG/RTSP relay, or `--reset` to erase the configuration and run first-run setup again.

## Configuration

Edit `/opt/BambuBot/hom.env`, then start the bot:

```bash
sudo systemctl restart bambubot.service
```

Required values:

```dotenv
DISCORD_TOKEN=your-bot-token
CLIENT_ID=your-application-id
GUILD_ID=your-test-server-id
BAMBU_PRINTERS=[{"name":"X1 Carbon","host":"192.168.1.50","accessCode":"your-lan-access-code","serialNumber":"your-printer-serial"}]
```

Keep `hom.env` private. It is ignored by Git and should have mode `600`.

### Command Log Channels

Enable Discord Developer Mode, then right-click a channel and choose **Copy Channel ID**. Use one shared channel or separate channels:

```dotenv
LOG_CHANNEL_ID=123456789012345678
LOG_CHANNEL_SUCCESS_ID=
LOG_CHANNEL_ERROR_ID=
```

`LOG_CHANNEL_SUCCESS_ID` and `LOG_CHANNEL_ERROR_ID` override the shared value for their matching outcome. The bot needs permission to view and send messages in those channels.

### Camera and RTSP Streaming

Snapshots need no additional configuration. To enable the MJPEG camera URL and RTSP service, set a LAN-reachable hostname/IP, an unused HTTP port, and the exact configured printer name:

```dotenv
BAMBU_STREAM_HOST=gideon.local
BAMBU_STREAM_PORT=8080
BAMBU_RTSP_PRINTER=X1 Carbon
```

Then start the relevant services:

```bash
sudo systemctl restart bambubot.service mediamtx.service
sudo systemctl enable --now bambu-rtsp-relay.service
```

The MJPEG URL is `http://gideon.local:8080/stream/X1%20Carbon.mjpeg`; the RTSP URL is `rtsp://gideon.local:8554/X1%20Carbon`. These endpoints have no application-level authentication. Keep ports `8080` and `8554` limited to your LAN or protect them with a firewall.

## Discord Commands

| Command | Description |
| --- | --- |
| `/help` | Lists every currently registered command and option. |
| `/ping` | Reports bot and Discord API latency. |
| `/bambu-status printer:<name>` | Shows one printer's state, progress, remaining time, and active file. |
| `/bambu-status-all` | Shows the current status of all configured printers. |
| `/bambu-control printer:<name> action:<action>` | Pauses, resumes, stops, changes speed, or controls the chamber light. Stop requires `confirm_stop:true`; Manage Server permission is required. |
| `/bambu-maintenance home printer:<name> confirm:true` | Homes all printer axes. Requires Manage Server permission. |
| `/bambu-maintenance load printer:<name> ams:<0+> slot:<0-3> confirm:true` | Loads filament from an AMS slot. Requires Manage Server permission. |
| `/bambu-maintenance set-filament printer:<name> ams:<0+> slot:<0-3> type:<type> color:<RRGGBBAA>` | Sets the displayed material type and RGBA color metadata for an AMS slot. Requires Manage Server permission. |
| `/bambu-channel set channel:<channel>` | Sets the current server's printer-notification channel. |
| `/bambu-channel clear` | Disables printer notifications in the current server. |
| `/bambu-notify set user:<user>` | Mentions a user for printer state-change notifications. |
| `/bambu-notify clear` | Stops user mentions for printer notifications. |
| `/bambu-snapshot [printer:<name>]` | Posts a camera image for one printer, or every configured printer when omitted. |
| `/bambu-camera-link printer:<name>` | Returns the configured MJPEG camera URL. |

## Operations

```bash
sudo systemctl status bambubot.service
sudo systemctl restart bambubot.service
sudo journalctl -u bambubot.service -f
tail -f /opt/BambuBot/logs/commands.log
```

The sync job records deployments in `/opt/BambuBot/sync.log`. To pull a pushed change right away instead of waiting for the next quarter hour:

```bash
/opt/BambuBot/deploy/sync-bambubot.sh
```

When `commands/` or `deploy-commands.js` changes, sync automatically re-registers slash commands. When `package-lock.json` changes, it refreshes production dependencies. Every changed deploy restarts `bambubot.service`.

## AMS Physical Unload

The Bambu LAN MQTT protocol does not expose a verified, model-independent command to physically unload filament from the AMS. The bot intentionally does not send a guessed motor or G-code sequence for that operation. Use the printer touchscreen or Bambu Studio to unload until a tested protocol command is available for the specific printer model.
