import { Tool } from '../services/tool-executor';
import { executeCommand } from '../utils/process-utils';

export const CheckStatusTool: Tool = {
  name: 'check_openclaw_status',
  description: 'Check the running status of OpenClaw Gateway.',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  execute: async () => {
    // Basic check using ps or lsof
    // Try to find process listening on port 18789 first
    const { stdout: lsofOut } = await executeCommand('lsof -nP -iTCP:18789 -sTCP:LISTEN -t');
    if (lsofOut.trim()) {
        const pid = parseInt(lsofOut.trim());
        return {
            running: true,
            pid,
            source: 'port_18789'
        };
    }

    // Fallback to process name check
    const { stdout } = await executeCommand('ps aux | grep "openclaw gateway" | grep -v grep');
    if (stdout.trim()) {
        const match = stdout.trim().match(/\s+(\d+)\s+/);
        return {
            running: true,
            pid: match ? parseInt(match[1]) : undefined,
            raw: stdout.trim(),
            source: 'process_name'
        };
    }
    return { running: false };
  }
};
