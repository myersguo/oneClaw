# OpenClaw Troubleshooting Guide

## Gateway Issues

### Gateway fails to start
**Symptoms:**
- Error: "EADDRINUSE: address already in use"
- Process exits immediately

**Solutions:**
1. Check if port is occupied: `lsof -i :18789`
2. Kill existing process: `kill <PID>`
3. Check Node.js version: `node -v` (Must be >= 22)

### Gateway not reachable
**Symptoms:**
- Frontend shows "Disconnected"
- API calls timeout

**Solutions:**
1. Verify Gateway is running: `openclaw status`
2. Check firewall settings
3. Ensure client and gateway are on same network or properly tunneled

## Device Connection Issues

### Device shows "Offline"
**Symptoms:**
- Device listed in `devices/paired.json` but inactive

**Solutions:**
1. Check device network connection
2. Restart OpenClaw client on the device
3. Re-pair the device via `openclaw onboard`

## Agent Issues

### Agent returns empty response
**Symptoms:**
- Tool calls succeed but no final answer

**Solutions:**
1. Check LLM API Key validity
2. Check OpenAI/Provider service status
3. Review logs for "Context length exceeded" errors
