import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function executeCommand(command: string, cwd?: string, env?: Record<string, string>): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execAsync(command, { 
        cwd,
        env: env ? { ...process.env, ...env } : process.env 
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.code || 1
    };
  }
}

export function spawnProcess(command: string, args: string[], cwd?: string): ChildProcess {
  return spawn(command, args, {
    cwd,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}
