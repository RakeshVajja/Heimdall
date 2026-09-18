import { execFile } from 'child_process';
import util from 'util';
import path from 'path';
import { executeInSandbox } from './Sandbox.js';
import { terminalInputSchema, ToolResult } from '@heimdall/shared';
import { config } from '../config/index.js';

const execFilePromise = util.promisify(execFile);

// Strictly allow safe utility commands
const ALLOWED_COMMANDS = new Set([
  'echo', 'node', 'ls', 'pwd', 'cat', 'head', 'tail', 'grep', 'wc', 'find', 'git', 'date'
]);

export async function executeTerminal(rawArgs: unknown): Promise<ToolResult> {
  return executeInSandbox(
    'terminal',
    terminalInputSchema,
    rawArgs,
    async ({ command, args }) => {
      const trimmedCommand = command.trim().toLowerCase();

      if (!ALLOWED_COMMANDS.has(trimmedCommand)) {
        throw new Error(`Command '${trimmedCommand}' is not in the security allowlist. Allowed commands: ${Array.from(ALLOWED_COMMANDS).join(', ')}`);
      }

      const sandboxRoot = path.resolve(config.sandbox.baseDir);
      const commandArgs = args || [];
      
      const { stdout, stderr } = await execFilePromise(trimmedCommand, commandArgs, {
        cwd: sandboxRoot,
        timeout: 10000,
        maxBuffer: 1024 * 1024,
      });

      return {
        command: `${trimmedCommand} ${commandArgs.join(' ')}`,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
      };
    }
  );
}
