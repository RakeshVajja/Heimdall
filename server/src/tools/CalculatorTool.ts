import { evaluate } from 'mathjs';
import { executeInSandbox } from './Sandbox.js';
import { calculatorInputSchema } from '@heimdall/shared';
import { ToolResult } from '@heimdall/shared';

export async function executeCalculator(rawArgs: unknown): Promise<ToolResult> {
  return executeInSandbox(
    'calculator',
    calculatorInputSchema,
    rawArgs,
    async ({ expression }) => {
      // Evaluate math expression safely with mathjs
      const result = evaluate(expression);
      return {
        expression,
        result: String(result),
        type: typeof result,
      };
    }
  );
}
