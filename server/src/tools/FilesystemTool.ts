import fs from 'fs/promises';
import path from 'path';
import { executeInSandbox } from './Sandbox.js';
import { filesystemInputSchema, ToolResult } from '@heimdall/shared';
import { config } from '../config/index.js';

export async function executeFilesystem(rawArgs: unknown): Promise<ToolResult> {
  return executeInSandbox(
    'filesystem',
    filesystemInputSchema,
    rawArgs,
    async ({ operation, path: targetPath, content }) => {
      const sandboxRoot = path.resolve(config.sandbox.baseDir);
      await fs.mkdir(sandboxRoot, { recursive: true });

      // Prevent directory traversal attacks
      const normalizedPath = path.normalize(targetPath).replace(/^(\.\.(\/|\\|$))+/, '');
      const fullPath = path.resolve(sandboxRoot, normalizedPath);

      if (!fullPath.startsWith(sandboxRoot)) {
        throw new Error('Access denied: Path is outside the sandbox directory.');
      }

      switch (operation) {
        case 'read': {
          const data = await fs.readFile(fullPath, 'utf-8');
          return { operation: 'read', path: normalizedPath, content: data, sizeBytes: Buffer.byteLength(data) };
        }
        case 'write': {
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, content || '', 'utf-8');
          return { operation: 'write', path: normalizedPath, status: 'success', bytesWritten: (content || '').length };
        }
        case 'list': {
          try {
            const entries = await fs.readdir(fullPath, { withFileTypes: true });
            const list = entries.map(e => ({
              name: e.name,
              isDirectory: e.isDirectory(),
              isFile: e.isFile(),
            }));
            return { operation: 'list', path: normalizedPath, entries: list };
          } catch {
            return { operation: 'list', path: normalizedPath, entries: [] };
          }
        }
        case 'delete': {
          await fs.rm(fullPath, { recursive: true, force: true });
          return { operation: 'delete', path: normalizedPath, status: 'deleted' };
        }
        case 'exists': {
          try {
            await fs.access(fullPath);
            return { operation: 'exists', path: normalizedPath, exists: true };
          } catch {
            return { operation: 'exists', path: normalizedPath, exists: false };
          }
        }
        default:
          throw new Error(`Unknown filesystem operation: ${operation}`);
      }
    }
  );
}
