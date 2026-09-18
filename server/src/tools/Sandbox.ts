import { ZodSchema } from 'zod';
import { ToolResult, ToolExecutionSandboxConfig } from '@heimdall/shared';

const DEFAULT_SANDBOX_CONFIG: ToolExecutionSandboxConfig = {
  timeoutMs: 15000,
  maxOutputLengthBytes: 65536, // 64KB
  allowNetwork: true,
  allowFilesystemWrite: true,
};

export async function executeInSandbox<TInput, TOutput>(
  toolName: string,
  schema: ZodSchema<TInput>,
  rawArgs: unknown,
  executor: (args: TInput) => Promise<TOutput>,
  customConfig: Partial<ToolExecutionSandboxConfig> = {}
): Promise<ToolResult> {
  const config = { ...DEFAULT_SANDBOX_CONFIG, ...customConfig };
  const startTime = Date.now();

  // 1. Schema Validation via Zod
  const parseResult = schema.safeParse(rawArgs);
  if (!parseResult.success) {
    return {
      success: false,
      output: null,
      error: `Validation Error in parameters for ${toolName}: ${parseResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`,
      executionTimeMs: Date.now() - startTime,
    };
  }

  // 2. Timeout protected execution
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Tool ${toolName} execution timed out after ${config.timeoutMs}ms`)), config.timeoutMs);
    });

    const executionPromise = executor(parseResult.data);
    const rawOutput = await Promise.race([executionPromise, timeoutPromise]);

    // 3. Output size limit guard
    let sanitizedOutput: unknown = rawOutput;
    const outputString = typeof rawOutput === 'string' ? rawOutput : JSON.stringify(rawOutput);
    if (outputString.length > config.maxOutputLengthBytes) {
      sanitizedOutput = outputString.slice(0, config.maxOutputLengthBytes) + `\n...[Truncated: Output exceeded ${config.maxOutputLengthBytes} bytes]`;
    }

    return {
      success: true,
      output: sanitizedOutput,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      output: null,
      error: `Execution Error in ${toolName}: ${errorMessage}`,
      executionTimeMs: Date.now() - startTime,
    };
  }
}
