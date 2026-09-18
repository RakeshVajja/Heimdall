'use client';

import React from 'react';
import {
  Cpu,
  Settings,
  Activity,
  Sparkles,
  Shield,
  BarChart3,
  Database,
  Layers,
  Menu,
} from 'lucide-react';
import { ModelInfo, SystemHealthStatus } from '@heimdall/shared';

interface HeaderProps {
  currentTab: 'chat' | 'skills' | 'mcp' | 'eval' | 'memory';
  onTabChange: (tab: 'chat' | 'skills' | 'mcp' | 'eval' | 'memory') => void;
  selectedProvider: 'groq' | 'gemini' | 'ollama' | 'mock';
  onProviderChange: (provider: 'groq' | 'gemini' | 'ollama' | 'mock') => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  models: ModelInfo[];
  health: SystemHealthStatus | null;
  onOpenSettings: () => void;
  onToggleSidebar?: () => void;
}

export function Header({
  currentTab,
  onTabChange,
  selectedProvider,
  onProviderChange,
  selectedModel,
  onModelChange,
  models,
  health,
  onOpenSettings,
  onToggleSidebar,
}: HeaderProps) {
  const filteredModels = models.filter((m) => m.provider === selectedProvider);

  return (
    <header className="h-14 border-b border-white/10 bg-[#0a0d14]/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between z-10">
      {/* Left: Brand & Mobile Sidebar Toggle */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden w-8 h-8 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shadow-glow-cyan">
            H
          </div>
          <span className="font-bold text-sm tracking-tight text-white hidden sm:inline">
            Heimdall <span className="text-[10px] text-cyan-400 font-normal border border-cyan-500/30 px-1.5 py-0.5 rounded-full ml-1">v1.0</span>
          </span>
        </div>

        {/* View Switcher Tabs */}
        <nav className="flex items-center gap-1 ml-2 sm:ml-4 bg-slate-950/60 p-1 rounded-lg border border-white/5 text-xs font-medium">
          <button
            onClick={() => onTabChange('chat')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
              currentTab === 'chat'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Agent Chat</span>
          </button>

          <button
            onClick={() => onTabChange('skills')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
              currentTab === 'skills'
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Skills Studio</span>
          </button>

          <button
            onClick={() => onTabChange('mcp')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
              currentTab === 'mcp'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden md:inline">MCP Hub</span>
          </button>

          <button
            onClick={() => onTabChange('eval')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
              currentTab === 'eval'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Evaluations</span>
          </button>

          <button
            onClick={() => onTabChange('memory')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
              currentTab === 'memory'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Memory</span>
          </button>
        </nav>
      </div>

      {/* Right: LLM Provider, Model Picker, Health & Settings */}
      <div className="flex items-center gap-2">
        {/* Provider Switcher */}
        <div className="flex items-center gap-1 bg-slate-950/80 border border-white/10 rounded-lg p-0.5 text-xs">
          <select
            value={selectedProvider}
            onChange={(e) => {
              const p = e.target.value as any;
              onProviderChange(p);
              const available = models.filter((m) => m.provider === p);
              if (available[0]) onModelChange(available[0].id);
            }}
            className="bg-transparent text-slate-200 text-xs font-semibold px-2 py-1 focus:outline-none cursor-pointer"
          >
            <option value="groq" className="bg-slate-900 text-slate-100">Groq (LPU)</option>
            <option value="gemini" className="bg-slate-900 text-slate-100">Google Gemini</option>
            <option value="ollama" className="bg-slate-900 text-slate-100">Ollama (Local)</option>
            <option value="mock" className="bg-slate-900 text-slate-100">Fast Neural (Offline)</option>
          </select>

          {/* Model Picker */}
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="bg-slate-900/90 text-cyan-300 border-l border-white/10 text-xs font-mono px-2 py-1 rounded-r-md focus:outline-none max-w-[140px] sm:max-w-[200px] truncate cursor-pointer"
          >
            {filteredModels.map((m) => (
              <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
                {m.name}
              </option>
            ))}
            {filteredModels.length === 0 && (
              <option value="default" className="bg-slate-900 text-slate-200">Default Model</option>
            )}
          </select>
        </div>

        {/* Health Telemetry Pill */}
        {health && (
          <div
            className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900/80 border border-white/5 text-[11px] text-slate-300 font-mono"
            title={`Database: ${health.database.type} (${health.database.status}) • Cache: ${health.cache.type}`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{health.status}</span>
          </div>
        )}

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center transition-all"
          title="Platform Settings & API Keys"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
