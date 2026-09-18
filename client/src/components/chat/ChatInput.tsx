'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Sparkles, Bot, Zap, Compass } from 'lucide-react';
import { SkillDefinition } from '@heimdall/shared';

interface ChatInputProps {
  onSendMessage: (content: string, isAgentMode: boolean) => void;
  isStreaming: boolean;
  onStopStreaming?: () => void;
  selectedSkill?: SkillDefinition | null;
  onClearSkill?: () => void;
}

const QUICK_ACTIONS = [
  { label: 'Review Code', prompt: 'Perform an architectural and security code review on this TypeScript implementation.' },
  { label: 'Search Web', prompt: 'Search the web for the latest updates and documentation on this topic.' },
  { label: 'Check Weather', prompt: 'What is the current weather in Tokyo and what should I wear?' },
  { label: 'Calculate Formula', prompt: 'Calculate the compound interest on $10,000 at 7.5% annual rate for 5 years.' },
];

export function ChatInput({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  selectedSkill,
  onClearSkill,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isAgentMode, setIsAgentMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim(), isAgentMode);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="p-4 border-t border-white/10 bg-[#0a0d14]/90 backdrop-blur-md">
      <div className="max-w-4xl mx-auto space-y-2.5">
        {/* Quick action chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-slate-400 no-scrollbar">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Zap className="w-3 h-3 text-amber-400" /> Prompts:
          </span>
          {QUICK_ACTIONS.map((action, idx) => (
            <button
              key={idx}
              onClick={() => setInput(action.prompt)}
              className="flex-shrink-0 px-2.5 py-1 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-white/5 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-300 transition-all text-xs"
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Input box card */}
        <div className="relative rounded-xl border border-white/10 bg-slate-950/80 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/30 transition-all shadow-lg">
          {/* Active Mode / Skill Header */}
          <div className="flex items-center justify-between px-3 pt-2 text-xs border-b border-white/5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAgentMode(!isAgentMode)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-[11px] transition-all ${
                  isAgentMode
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-white/5'
                }`}
              >
                <Bot className="w-3 h-3" />
                <span>{isAgentMode ? '🤖 Autonomous Agent Active' : '⚡ Direct Chat'}</span>
              </button>

              {selectedSkill && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/30 text-[11px] font-medium">
                  <Sparkles className="w-3 h-3 text-violet-400" />
                  <span>Skill: {selectedSkill.name}</span>
                  {onClearSkill && (
                    <button onClick={onClearSkill} className="ml-1 hover:text-white">
                      ×
                    </button>
                  )}
                </div>
              )}
            </div>

            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Return to send • Shift+Return for newline
            </span>
          </div>

          {/* Textarea */}
          <div className="flex items-end p-2.5 gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isAgentMode
                  ? "Give Heimdall an autonomous objective (e.g. 'Search web for latest TypeScript 5.5 features, write a summary to sandbox, and compute release metrics')..."
                  : "Ask Heimdall anything across code, architecture, tools, or research..."
              }
              rows={1}
              className="flex-1 bg-transparent border-0 resize-none text-slate-100 placeholder-slate-500 text-sm focus:ring-0 focus:outline-none max-h-44 py-1.5 px-1 leading-relaxed"
            />

            {/* Action buttons */}
            <div className="flex items-center gap-1.5">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStopStreaming}
                  className="w-9 h-9 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 flex items-center justify-center transition-all shadow-sm"
                  title="Stop generation"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    input.trim()
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-glow-cyan'
                      : 'bg-slate-900 text-slate-600 border border-white/5 cursor-not-allowed'
                  }`}
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
