# OpenClaw CLI Reference

OpenClaw is your personal AI assistant platform. This reference documents the Command Line Interface (CLI) commands available in version 2026.3.8.

## Global Options

These options can be used with any command:

*   `--profile <name>`: Use a named profile (isolates config/state under `~/.openclaw-<name>`).
*   `--dev`: Dev profile mode (isolates state under `~/.openclaw-dev`, default port 19001).
*   `--log-level <level>`: Global log level override (`silent|fatal|error|warn|info|debug|trace`).
*   `--no-color`: Disable ANSI colors.
*   `-V, --version`: Output the version number.
*   `-h, --help`: Display help for command.

---

## Core Commands

### `openclaw gateway`
Run, inspect, and query the WebSocket Gateway. The gateway is the core service that manages connections, agents, and channels.

**Usage:** `openclaw gateway [options] [command]`

**Options:**
*   `--port <port>`: Port for the gateway WebSocket (default: 18789).
*   `--auth <mode>`: Gateway auth mode (`none`, `token`, `password`, `trusted-proxy`).
*   `--token <token>`: Shared token required for connection (defaults to `OPENCLAW_GATEWAY_TOKEN`).
*   `--bind <mode>`: Bind mode (`loopback`, `lan`, `tailnet`, `auto`, `custom`).
*   `--tailscale <mode>`: Tailscale exposure mode (`off`, `serve`, `funnel`).
*   `--dev`: Create a dev config + workspace if missing.
*   `--verbose`: Verbose logging to stdout/stderr.
*   `--force`: Kill any existing listener on the target port before starting.

**Subcommands:**
*   `run`: Run the WebSocket Gateway (foreground).
*   `start`: Start the Gateway service (background daemon).
*   `stop`: Stop the Gateway service.
*   `restart`: Restart the Gateway service.
*   `status`: Show gateway service status + probe reachability.
*   `health`: Fetch Gateway health.
*   `discover`: Discover gateways via Bonjour.
*   `call`: Call a Gateway method directly.

**Examples:**
```bash
openclaw gateway run --port 18789
openclaw gateway status
openclaw gateway discover
```

### `openclaw agent`
Run an agent turn via the Gateway (or locally). This allows you to interact with the AI agent directly from the command line.

**Usage:** `openclaw agent [options]`

**Options:**
*   `-m, --message <text>`: Message body for the agent.
*   `-t, --to <number>`: Recipient number (E.164) to derive session key.
*   `--session-id <id>`: Use an explicit session id.
*   `--agent <id>`: Specific agent ID to use (overrides routing).
*   `--thinking <level>`: Thinking level (`off`, `minimal`, `low`, `medium`, `high`).
*   `--channel <channel>`: Delivery channel (e.g., `telegram`, `whatsapp`, `slack`).
*   `--deliver`: Send the agent's reply back to the selected channel.
*   `--local`: Run the embedded agent locally (requires direct API keys).
*   `--json`: Output result as JSON.
*   `--verbose <on|off>`: Persist agent verbose level for the session.

**Examples:**
```bash
# Start a new session
openclaw agent --to +15555550123 --message "status update"

# Use a specific agent with medium thinking
openclaw agent --agent ops --message "Summarize logs" --thinking medium

# Send a reply back to the actual channel (e.g. WhatsApp)
openclaw agent --to +15555550123 --message "Summon reply" --deliver
```

### `openclaw message`
Send, read, and manage messages and channel actions across supported platforms (Discord, Telegram, WhatsApp, Slack, etc.).

**Usage:** `openclaw message [options] [command]`

**Subcommands:**
*   `send`: Send a message.
*   `read`: Read recent messages.
*   `edit`: Edit a message.
*   `delete`: Delete a message.
*   `react`: Add or remove a reaction.
*   `poll`: Send a poll (e.g., Discord).
*   `broadcast`: Broadcast a message to multiple targets.
*   `channel`: Channel actions (create, archive, etc.).
*   `member`: Member actions (ban, kick, timeout).
*   `voice`: Voice actions.

**Examples:**
```bash
# Send a simple text message
openclaw message send --target +15555550123 --message "Hi"

# Send a message with media
openclaw message send --target +15555550123 --message "Check this" --media photo.jpg

# Create a poll on Discord
openclaw message poll --channel discord --target channel:123 --poll-question "Snack?" --poll-option Pizza --poll-option Sushi
```

### `openclaw pairing`
Secure DM pairing (approve inbound requests).

**Usage:** `openclaw pairing [command]`

**Subcommands:**
*   `approve <channel_type> <code_or_user_id>`: Approve a pairing request.

**Example:**
```bash
openclaw pairing approve feishu 7TS46FQC
```

### `openclaw cron`
Manage cron jobs via the Gateway scheduler. Automate agent tasks, messages, and system events.

**Usage:** `openclaw cron [options] [command]`

**Subcommands:**
*   `add` / `create`: Add a cron job.
*   `list`: List cron jobs.
*   `rm`: Remove a cron job.
*   `run`: Run a cron job immediately (for testing).
*   `status`: Show cron scheduler status.
*   `enable` / `disable`: Toggle job status.

**`add` Options:**
*   `--name <name>`: Job name (unique ID).
*   `--cron <expr>`: Cron expression (e.g., `0 * * * *` for hourly).
*   `--every <duration>`: Simple duration interval (e.g., `1h`, `30m`).
*   `--message <text>`: The message/instruction for the agent.
*   `--channel <channel>`: Delivery channel (e.g., `telegram`, `whatsapp`).
*   `--to <dest>`: Delivery destination (e.g., `self` or phone number).
*   `--agent <id>`: Specific agent ID to handle the task.
*   `--model <model>`: Model override for this job.
*   `--announce`: Announce a summary to the chat.

**Examples:**
```bash
# Run a task every hour
openclaw cron add --name "hourly-search" --every 1h --message "Open browser and search for latest AI news" --to self

# Send a daily report at 9am
openclaw cron add --name "daily-report" --cron "0 9 * * *" --message "Summarize yesterday's logs" --channel telegram --to -100123456789
```

---

## Configuration & Setup

### `openclaw config`
Non-interactive config helpers. Use this to get, set, or validate configuration values.

**Subcommands:**
*   `get <path>`: Get a config value by dot path (e.g., `gateway.port`).
*   `set <path> <value>`: Set a config value.
*   `unset <path>`: Remove a config value.
*   `file`: Print the active config file path.
*   `validate`: Validate the current config against the schema.

### `openclaw configure`
Interactive setup wizard for credentials, channels, gateway, and agent defaults.

### `openclaw setup`
Initialize local config and agent workspace.

### `openclaw onboard`
Interactive onboarding wizard for gateway, workspace, and skills.

### `openclaw reset`
Reset local config/state (keeps the CLI installed).

---

## Management & Utilities

*   `openclaw status`: Show channel health and recent session recipients.
*   `openclaw doctor`: Health checks + quick fixes for the gateway and channels.
*   `openclaw logs`: Tail gateway file logs via RPC.
*   `openclaw update`: Update OpenClaw and inspect update channel status.
*   `openclaw uninstall`: Uninstall the gateway service + local data.
*   `openclaw docs`: Search the live OpenClaw documentation.

---

## Other Commands

*   `acp`: Agent Control Protocol tools.
*   `agents`: Manage isolated agents (workspaces, auth, routing).
*   `approvals`: Manage exec approvals (gateway or node host).
*   `backup`: Create and verify local backup archives.
*   `browser`: Manage OpenClaw's dedicated browser (Chrome/Chromium).
*   `channels`: Manage connected chat channels.
*   `cron`: Manage cron jobs via the Gateway scheduler.
*   `dashboard`: Open the Control UI with your current token.
*   `devices`: Device pairing + token management.
*   `directory`: Lookup contact and group IDs.
*   `dns`: DNS helpers for wide-area discovery.
*   `hooks`: Manage internal agent hooks.
*   `memory`: Search and reindex memory files.
*   `models`: Discover, scan, and configure models.
*   `node`: Run and manage the headless node host service.
*   `nodes`: Manage gateway-owned node pairing and node commands.
*   `pairing`: Secure DM pairing (approve inbound requests).
*   `plugins`: Manage OpenClaw plugins and extensions.
*   `qr`: Generate iOS pairing QR/setup code.
*   `sandbox`: Manage sandbox containers for agent isolation.
*   `secrets`: Secrets runtime reload controls.
*   `security`: Security tools and local config audits.
*   `sessions`: List stored conversation sessions.
*   `skills`: List and inspect available skills.
*   `system`: System events, heartbeat, and presence.
*   `tui`: Open a terminal UI connected to the Gateway.
*   `webhooks`: Webhook helpers and integrations.

---

For more detailed information on any command, run:
```bash
openclaw <command> --help
```
