'use client';

import React, { useEffect, useRef } from 'react';
import { Message, AgentTrace } from '@heimdall/shared';
import { MessageItem } from './MessageItem';
import { Bot, Sparkles, Terminal, Shield, Cpu } from 'lucide-react';

interface MessagePaneProps {
  messages: Message[];
  streamingText?: string;
  streamingProvider?: string;
  isStreaming: boolean;
  onOpenTrace?: (trace: AgentTrace) => void;
  onSelectPrompt?: (prompt: string) => void;
}

export function MessagePane({
  messages,
  streamingText,
  streamingProvider,
  isStreaming,
  onOpenTrace,
  onSelectPrompt,
}: MessagePaneProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-xl space-y-6">
          {/* Logo & Headline */}
          <div className="space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-violet-500/20 to-emerald-500/20 border border-cyan-500/40 mx-auto flex items-center justify-center text-cyan-300 shadow-glow-cyan">
              <Bot className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Heimdall Autonomous Agent Platform
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Full-scope TypeScript AI Orchestration with Multi-LLM Routing (Groq / Gemini / Ollama), MCP Protocol, Sandboxed Native Tools, and Semantic Vector Memory.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1.5">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
                <Cpu className="w-4 h-4" />
                <span>Multi-LLM Router</span>
              </div>
              <p className="text-xs text-slate-400">
                Instant streaming across Groq LPU, Google Gemini 2.0 Flash, and local Ollama models with failover.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <Terminal className="w-4 h-4" />
                <span>Autonomous Agent Loop</span>
              </div>
              <p className="text-xs text-slate-400">
                Plan → Reason → Tool Selection → Sandboxed Execution → Live Socket Trace visualizer.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1.5">
              <div className="flex items-center gap-2 text-violet-400 text-xs font-semibold">
                <Shield className="w-4 h-4" />
                <span>Model Context Protocol (MCP)</span>
              </div>
              <p className="text-xs text-slate-400">
                Full standard JSON-RPC 2.0 client connecting to Filesystem, GitHub, and Web Search MCP servers.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>Skill Engine & Eval Harness</span>
              </div>
              <p className="text-xs text-slate-400">
                5 pre-seeded specialized skills, prompt versioning, and automated 15-case benchmark matrix.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
      <div className="max-w-4xl mx-auto space-y-3">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            onOpenTrace={onOpenTrace}
          />
        ))}

        {/* Live streaming bubble */}
        {isStreaming && (
          <div className="flex gap-3.5 px-4 py-4 rounded-xl bg-slate-900/50 border border-cyan-500/30 shadow-glow-cyan animate-fade-in">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-cyan-300">Heimdall Streaming</span>
                {streamingProvider && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {streamingProvider.toUpperCase()}
                  </span>
                )}
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              </div>
              <div className="text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                {streamingText || 'Thinking...'}
                <span className="inline-block w-1.5 h-4 ml-1 bg-cyan-400 animate-pulse align-middle" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
