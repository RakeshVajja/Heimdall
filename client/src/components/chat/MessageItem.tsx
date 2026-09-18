'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, AgentTrace } from '@heimdall/shared';
import { CodeBlock } from './CodeBlock';
import { Bot, User, Cpu, Clock, Layers, Sparkles, Activity } from 'lucide-react';

interface MessageItemProps {
  message: Message;
  onOpenTrace?: (trace: AgentTrace) => void;
}

export function MessageItem({ message, onOpenTrace }: MessageItemProps) {
  const isAssistant = message.role === 'assistant';
  const metadata = message.metadata;
  const hasTrace = !!metadata?.trace;

  return (
    <div
      className={`group flex gap-3.5 px-4 py-4 rounded-xl transition-all duration-150 ${
        isAssistant
          ? 'bg-slate-900/40 border border-white/[0.04]'
          : 'bg-transparent'
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isAssistant ? (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-glow-cyan">
            <Bot className="w-4 h-4" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <User className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Message Body */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Header / Meta */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-200">
              {isAssistant ? 'Heimdall AI' : 'You'}
            </span>
            {isAssistant && metadata?.provider && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Cpu className="w-2.5 h-2.5" />
                {metadata.provider.toUpperCase()}
                {metadata.model ? ` • ${metadata.model}` : ''}
              </span>
            )}
            {isAssistant && metadata?.skillId && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                <Sparkles className="w-2.5 h-2.5" />
                Skill Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            {metadata?.latencyMs && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {metadata.latencyMs}ms
              </span>
            )}
            {metadata?.totalTokens && (
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {metadata.totalTokens} tokens
              </span>
            )}
          </div>
        </div>

        {/* Markdown Content */}
        <div className="prose-dark overflow-hidden break-words text-slate-200 text-sm leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <CodeBlock
                    language={match[1]}
                    value={String(children).replace(/\n$/, '')}
                  />
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Agent Trace Button */}
        {hasTrace && onOpenTrace && metadata?.trace && (
          <div className="pt-2">
            <button
              onClick={() => onOpenTrace(metadata.trace!)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-cyan-950/40 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 text-xs font-medium transition-all shadow-sm group"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400 group-hover:animate-pulse" />
              <span>View Autonomous Trace ({metadata.trace.steps.length} Steps)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
