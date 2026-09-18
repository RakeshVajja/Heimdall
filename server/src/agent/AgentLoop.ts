import {
  AgentStep,
  AgentTrace,
  AgentExecutionConfig,
  AgentResult,
  ChatMessage,
} from '@heimdall/shared';
import { toolRegistry } from '../tools/ToolRegistry.js';
import { llmRouter } from '../llm/LLMRouter.js';
import { memoryEngine } from '../memory/MemoryEngine.js';
import { skillEngine } from '../skills/SkillEngine.js';

export interface AgentEventEmitter {
  emitStep: (step: AgentStep) => void;
  emitTraceUpdate: (trace: AgentTrace) => void;
}

export class AgentLoop {
  async execute(
    prompt: string,
    userId: string,
    conversationId: string = 'conv_agent_' + Date.now(),
    config: AgentExecutionConfig = {},
    emitter?: AgentEventEmitter
  ): Promise<AgentResult> {
    const startTime = Date.now();
    const maxSteps = config.maxSteps || 10;
    const allowedTools = config.allowedTools;

    const traceId = 'trace_' + Math.random().toString(36).substring(2, 9);
    const trace: AgentTrace = {
      id: traceId,
      conversationId,
      userPrompt: prompt,
      steps: [],
      totalSteps: 0,
      totalLatencyMs: 0,
      status: 'running',
      startTime: new Date().toISOString(),
    };

    const pushStep = (step: Omit<AgentStep, 'id' | 'stepNumber' | 'timestamp'>): AgentStep => {
      const fullStep: AgentStep = {
        ...step,
        id: 'step_' + (trace.steps.length + 1) + '_' + Math.random().toString(36).substring(2, 7),
        stepNumber: trace.steps.length + 1,
        timestamp: new Date().toISOString(),
      };
      trace.steps.push(fullStep);
      trace.totalSteps = trace.steps.length;
      trace.totalLatencyMs = Date.now() - startTime;

      if (emitter) {
        emitter.emitStep(fullStep);
        emitter.emitTraceUpdate(trace);
      }
      return fullStep;
    };

    try {
      // 1. Skill & Memory Context Retrieval
      let systemPrompt = `You are Heimdall, an autonomous AI Agent Orchestrator.
You solve user tasks by reasoning methodically through:
1. Formulating an explicit Plan.
2. Selecting and executing tools when information is needed.
3. Observing tool outputs.
4. Synthesizing observations into a final authoritative answer.

When calling a tool, format your action as:
TOOL: <tool_name>
ARGS: <json_arguments>

When you have sufficient information to conclude, output:
FINAL ANSWER: <your comprehensive response>
`;

      if (config.skillId) {
        const skill = await skillEngine.getSkill(config.skillId);
        if (skill) {
          systemPrompt += `\n\nActive Skill: ${skill.name}\n${skill.systemPrompt}`;
        }
      }

      if (config.includeMemoryRetrieval !== false) {
        const memContext = await memoryEngine.retrieveContext(prompt, userId);
        if (memContext.retrievedMemories.length > 0) {
          systemPrompt += `\n\nRelevant Long-Term Memories:\n${memContext.retrievedMemories.map(m => `- ${m.text}`).join('\n')}`;
        }
      }

      const availableTools = toolRegistry.getToolsForLLM(allowedTools);
      systemPrompt += `\n\nAvailable Tools in Registry:\n${JSON.stringify(availableTools, null, 2)}`;

      // Step 1: Planning
      pushStep({
        type: 'plan',
        phase: 'planning',
        title: 'Formulating Action Plan',
        content: `Analyzing goal: "${prompt.slice(0, 100)}". Assessing available tools: [${availableTools.map(t => t.name).join(', ')}].`,
        status: 'success',
      });

      const conversationHistory: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ];

      let isFinished = false;
      let finalAnswer = '';
      let loopCounter = 0;

      while (!isFinished && loopCounter < maxSteps) {
        loopCounter++;

        // Step: Reason & Decide Next Action
        const reasonStep = pushStep({
          type: 'thought',
          phase: 'reasoning',
          title: `Reasoning Cycle #${loopCounter}`,
          content: 'Evaluating current state and deciding optimal next action...',
          status: 'running',
        });

        const stepStartTime = Date.now();
        const llmResponse = await llmRouter.generate(conversationHistory, {
          provider: config.provider,
          model: config.model,
          temperature: config.temperature ?? 0.2,
        });

        const responseText = llmResponse.content;
        reasonStep.content = responseText;
        reasonStep.latencyMs = Date.now() - stepStartTime;
        reasonStep.status = 'success';
        if (emitter) emitter.emitTraceUpdate(trace);

        conversationHistory.push({ role: 'assistant', content: responseText });

        // Check for Final Answer
        if (responseText.includes('FINAL ANSWER:')) {
          finalAnswer = responseText.split('FINAL ANSWER:')[1].trim();
          isFinished = true;

          pushStep({
            type: 'final_answer',
            phase: 'finished',
            title: 'Final Synthesis',
            content: finalAnswer,
            status: 'success',
          });
          break;
        }

        // Parse Tool Call
        const toolMatch = responseText.match(/TOOL:\s*(\w+)/i);
        const argsMatch = responseText.match(/ARGS:\s*(\{[\s\S]*?\})/i);

        if (toolMatch && toolMatch[1]) {
          const toolName = toolMatch[1].trim();
          let toolArgs: Record<string, unknown> = {};

          if (argsMatch && argsMatch[1]) {
            try {
              toolArgs = JSON.parse(argsMatch[1]);
            } catch {
              toolArgs = {};
            }
          }

          // Tool Execution Step
          const toolStep = pushStep({
            type: 'tool_call',
            phase: 'executing_tool',
            title: `Invoking Tool: ${toolName}`,
            content: `Parameters: ${JSON.stringify(toolArgs)}`,
            toolName,
            toolInput: toolArgs,
            status: 'running',
          });

          const toolExecStart = Date.now();
          const toolResult = await toolRegistry.executeTool(toolName, toolArgs);

          toolStep.toolOutput = toolResult.output;
          toolStep.latencyMs = Date.now() - toolExecStart;
          toolStep.status = toolResult.success ? 'success' : 'failed';
          toolStep.error = toolResult.error;
          if (emitter) emitter.emitTraceUpdate(trace);

          // Observation Step
          const observationContent = toolResult.success
            ? typeof toolResult.output === 'string'
              ? toolResult.output
              : JSON.stringify(toolResult.output, null, 2)
            : `Error: ${toolResult.error}`;

          pushStep({
            type: 'tool_result',
            phase: 'observing',
            title: `Observation from ${toolName}`,
            content: observationContent,
            toolName,
            toolOutput: toolResult.output,
            status: toolResult.success ? 'success' : 'failed',
          });

          conversationHistory.push({
            role: 'tool',
            name: toolName,
            content: `OBSERVATION from ${toolName}: ${observationContent}`,
          });
        } else {
          // If the model didn't call a tool or explicitly output FINAL ANSWER, treat the response as the conclusion
          finalAnswer = responseText;
          isFinished = true;

          pushStep({
            type: 'final_answer',
            phase: 'finished',
            title: 'Direct Response Completed',
            content: finalAnswer,
            status: 'success',
          });
        }
      }

      if (!isFinished && loopCounter >= maxSteps) {
        finalAnswer = `[Agent reached step limit (${maxSteps})]. Summary of findings:\n` + trace.steps.map(s => s.content).slice(-2).join('\n');
        trace.status = 'completed';
      } else {
        trace.status = 'completed';
      }

      trace.endTime = new Date().toISOString();
      trace.totalLatencyMs = Date.now() - startTime;
      if (emitter) emitter.emitTraceUpdate(trace);

      return {
        answer: finalAnswer,
        trace,
        latencyMs: trace.totalLatencyMs,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      trace.status = 'failed';
      trace.error = errorMsg;
      trace.endTime = new Date().toISOString();
      trace.totalLatencyMs = Date.now() - startTime;

      pushStep({
        type: 'reflection',
        phase: 'error',
        title: 'Execution Error',
        content: `Agent loop encountered error: ${errorMsg}`,
        status: 'failed',
        error: errorMsg,
      });

      if (emitter) emitter.emitTraceUpdate(trace);

      return {
        answer: `An error occurred during agent execution: ${errorMsg}`,
        trace,
        latencyMs: trace.totalLatencyMs,
      };
    }
  }
}

export const agentLoop = new AgentLoop();
