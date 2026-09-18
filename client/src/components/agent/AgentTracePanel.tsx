'use client';

import React from 'react';
import { AgentTrace, AgentStep } from '@heimdall/shared';
import {
  X,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  Eye,
  Brain,
  Lightbulb,
  CheckCheck,
} from 'lucide-react';

interface AgentTracePanelProps {
  trace: AgentTrace | null;
  onClose: () => void;
}

export function AgentTracePanel({ trace, onClose }: AgentTracePanelProps) {
  if (!trace) return null;

  const getStepIcon = (type: AgentStep['type']) => {
    switch (type) {
      case 'plan':
        return <Lightbulb className="w-3.5 h-3.5 text-amber-400" />;
      case 'thought':
        return <Brain className="w-3.5 h-3.5 text-cyan-400" />;
      case 'tool_call':
        return <Wrench className="w-3.5 h-3.5 text-violet-400" />;
      case 'tool_result':
        return <Eye className="w-3.5 h-3.5 text-emerald-400" />;
      case 'reflection':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
      case 'final_answer':
        return <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="w-full sm:w-[450px] lg:w-[500px] border-l border-white/10 bg-[#0c0f17]/95 backdrop-blur-xl flex flex-col h-full z-20 shadow-2xl animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white tracking-wide">
              Autonomous Agent Trace
            </h3>
            <span className="text-[10px] text-slate-400">
              {trace.steps.length} Steps • {trace.totalLatencyMs}ms
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
              trace.status === 'completed'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : trace.status === 'running'
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 animate-pulse'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            {trace.status.toUpperCase()}
          </span>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Goal Banner */}
      <div className="p-3 bg-slate-950/80 border-b border-white/5 text-xs text-slate-300">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
          Objective
        </span>
        <p className="line-clamp-2 font-mono text-[11px] text-cyan-200">
          "{trace.userPrompt}"
        </p>
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {trace.steps.map((step, idx) => (
          <div
            key={step.id || idx}
            className="relative rounded-xl border border-white/5 bg-slate-900/40 p-3 space-y-2 hover:border-white/10 transition-all text-xs"
          >
            {/* Step Top Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center">
                  {getStepIcon(step.type)}
                </div>
                <span className="font-semibold text-slate-200 text-xs">
                  {step.title}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                {step.latencyMs && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {step.latencyMs}ms
                  </span>
                )}
                {step.status === 'success' && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
                {step.status === 'running' && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                )}
              </div>
            </div>

            {/* Step Content */}
            <div className="text-slate-300 font-sans text-xs whitespace-pre-wrap leading-relaxed">
              {step.content}
            </div>

            {/* Tool Input / Output Inspector */}
            {step.toolInput && (
              <div className="mt-2 rounded-lg bg-black/40 p-2 border border-white/5 font-mono text-[11px]">
                <span className="text-[10px] text-violet-400 block mb-1 font-semibold">
                  Tool Arguments:
                </span>
                <pre className="text-slate-300 overflow-x-auto m-0">
                  {JSON.stringify(step.toolInput, null, 2)}
                </pre>
              </div>
            )}

            {step.toolOutput !== undefined && (
              <div className="mt-2 rounded-lg bg-black/40 p-2 border border-white/5 font-mono text-[11px]">
                <span className="text-[10px] text-emerald-400 block mb-1 font-semibold">
                  Tool Output:
                </span>
                <pre className="text-slate-300 overflow-x-auto max-h-36 m-0">
                  {typeof step.toolOutput === 'string'
                    ? (step.toolOutput as string)
                    : JSON.stringify(step.toolOutput, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
