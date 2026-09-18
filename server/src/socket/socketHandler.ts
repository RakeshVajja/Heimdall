import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../auth/jwt.js';
import { llmRouter } from '../llm/LLMRouter.js';
import { agentLoop } from '../agent/AgentLoop.js';
import { memoryEngine } from '../memory/MemoryEngine.js';
import { memoryDb } from '../db/models.js';
import { skillEngine } from '../skills/SkillEngine.js';
import {
  ChatMessage,
  SendMessagePayload,
  ChatStreamChunk,
  AgentExecutionConfig,
  AgentStep,
  AgentTrace,
  ClientApiKeys,
} from '@heimdall/shared';

export function setupSocketHandlers(io: Server): void {
  // Authentication middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    if (token) {
      const payload = verifyAccessToken(token);
      if (payload) {
        (socket as any).userId = payload.userId;
      }
    }
    // Allow connection even without token for guest / demo mode
    if (!(socket as any).userId) {
      (socket as any).userId = 'default_user';
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId || 'default_user';
    console.log(`[Socket] Client connected: ${socket.id} (user: ${userId})`);

    // 1. Regular Chat with Token-by-Token Streaming
    socket.on('chat:send', async (data: SendMessagePayload) => {
      const { conversationId = 'conv_' + Date.now(), content, provider, model, skillId, temperature, apiKeys } = data;
      const messageId = 'msg_' + Math.random().toString(36).substring(2, 9);
      const assistantMsgId = 'msg_ast_' + Math.random().toString(36).substring(2, 9);

      try {
        // Persist User Message
        const userMsg = await memoryDb.messages.create({
          id: messageId,
          conversationId,
          role: 'user',
          content,
        });

        // Background embed message into semantic vector memory
        memoryEngine.saveMessageMemory(userMsg, userId).catch(console.error);

        // Fetch past conversation messages
        const pastMsgs = await memoryDb.messages.find({ conversationId });
        pastMsgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        const formattedHistory: ChatMessage[] = pastMsgs.map(m => ({
          role: m.role,
          content: m.content,
        }));

        // Retrieve long-term memory context
        const memContext = await memoryEngine.retrieveContext(content, userId);
        let systemPrompt = 'You are Heimdall, an advanced AI Assistant.';

        if (skillId) {
          const skill = await skillEngine.getSkill(skillId);
          if (skill) systemPrompt = skill.systemPrompt;
        }

        if (memContext.retrievedMemories.length > 0) {
          systemPrompt += `\n\nRelevant past context:\n${memContext.retrievedMemories.map(m => `- ${m.text}`).join('\n')}`;
        }

        let accumulatedText = '';
        const startTime = Date.now();

        // Stream from LLMRouter
        const finalResponse = await llmRouter.stream(
          formattedHistory,
          {
            provider,
            model,
            temperature,
            systemPrompt,
            apiKeys,
          },
          (chunk) => {
            accumulatedText = chunk.accumulated;
            const streamChunk: ChatStreamChunk = {
              conversationId,
              messageId: assistantMsgId,
              delta: chunk.delta,
              accumulated: chunk.accumulated,
              isComplete: false,
            };
            socket.emit('chat:chunk', streamChunk);
          }
        );

        // Persist Assistant Message
        const assistantMsg = await memoryDb.messages.create({
          id: assistantMsgId,
          conversationId,
          role: 'assistant',
          content: accumulatedText,
          metadata: {
            provider: finalResponse.provider,
            model: finalResponse.model,
            promptTokens: finalResponse.promptTokens,
            completionTokens: finalResponse.completionTokens,
            totalTokens: finalResponse.totalTokens,
            latencyMs: Date.now() - startTime,
            skillId,
          },
        });

        // Background embed assistant message
        memoryEngine.saveMessageMemory(assistantMsg, userId).catch(console.error);

        // Emit final completion
        socket.emit('chat:complete', {
          conversationId,
          message: assistantMsg,
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        socket.emit('chat:error', {
          conversationId,
          error: errorMsg,
        });
      }
    });

    // 2. Autonomous Agent Execution with Real-Time Step Streaming
    socket.on('agent:run', async (data: { prompt: string; conversationId?: string; config?: AgentExecutionConfig; apiKeys?: ClientApiKeys }) => {
      const { prompt, conversationId = 'conv_agent_' + Date.now(), config = {}, apiKeys } = data;
      const userMsgId = 'msg_user_' + Math.random().toString(36).substring(2, 9);
      const agentMsgId = 'msg_agent_' + Math.random().toString(36).substring(2, 9);

      try {
        // Save user instruction
        await memoryDb.messages.create({
          id: userMsgId,
          conversationId,
          role: 'user',
          content: prompt,
        });

        const result = await agentLoop.execute(
          prompt,
          userId,
          conversationId,
          { ...config, apiKeys } as any,
          {
            emitStep: (step: AgentStep) => {
              socket.emit('agent:step', { conversationId, step });
            },
            emitTraceUpdate: (trace: AgentTrace) => {
              socket.emit('agent:trace', { conversationId, trace });
            },
          }
        );

        // Save Agent final message with embedded execution trace
        const savedMessage = await memoryDb.messages.create({
          id: agentMsgId,
          conversationId,
          role: 'assistant',
          content: result.answer,
          metadata: {
            provider: config.provider || 'groq',
            model: config.model,
            latencyMs: result.latencyMs,
            trace: result.trace,
            skillId: config.skillId,
          },
        });

        socket.emit('agent:complete', {
          conversationId,
          message: savedMessage,
          trace: result.trace,
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        socket.emit('agent:error', {
          conversationId,
          error: errorMsg,
        });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
}
