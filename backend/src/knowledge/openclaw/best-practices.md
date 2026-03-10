# OpenClaw Best Practices

## Configuration Management
- **Backup**: Always backup `openclaw.json` before making changes.
- **Secrets**: Do not store API keys directly in `openclaw.json` if possible; use environment variables (`OPENAI_API_KEY`).
- **Validation**: Validate JSON syntax after manual edits.

## Security
- **Port Exposure**: Do not expose the Gateway port (18789) to the public internet without authentication/VPN.
- **Sandboxing**: Run OpenClaw with a dedicated user account with limited permissions.

## Agent Design
- **Single Responsibility**: Create specialized agents for different tasks (e.g., "Coding Agent", "Home Automation Agent").
- **Clear Instructions**: Provide clear, specific System Prompts for custom agents.

## Maintenance
- **Updates**: Regularly update OpenClaw via `npm update -g openclaw`.
- **Logs**: Monitor logs periodically for errors or warnings.
- **Cleanup**: Remove unused devices and channels to reduce overhead.

## Automation

You can use `openclaw cron` to automate repetitive tasks. This is powerful for monitoring, reporting, or routine actions.

**Example: Hourly Web Search**
To open a browser and search Google every hour:
```bash
openclaw cron add --name "hourly-search" --every 1h --message "Open browser and search google for 'latest AI news'" --to self
```

**Example: Daily Report**
To generate a report every morning at 9 AM:
```bash
openclaw cron add --name "daily-report" --cron "0 9 * * *" --message "Read the logs from yesterday and summarize any errors" --to self
```

## Feishu/Lark Integration

To integrate OpenClaw with Feishu (Lark), follow these steps:

1.  **Create a Group**: Create a new group chat in Feishu/Lark.
2.  **Add Bot**: Go to Group Settings -> Bots -> Add Bot -> Custom Bot.
3.  **Configure Bot**:
    *   Set the bot name (e.g., "OpenClaw").
    *   (Optional) Set a security keyword if required by your policy.
4.  **Get Webhook**: Copy the Webhook URL. It looks like `https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.
5.  **Extract Key**: The last part of the URL is your `webhook_key`.
6.  **Configure OpenClaw**:
    Add the channel to your `openclaw.json`:
    ```json
    {
      "channels": [
        {
          "id": "feishu_group",
          "name": "Feishu Group",
          "type": "feishu",
          "config": {
            "webhook_key": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
            "secret": "your_secret_if_enabled"
          }
        }
      ]
    }
    ```
    *Note: If you enabled "Signature validation" in Feishu bot settings, you need to provide the `secret`.*
