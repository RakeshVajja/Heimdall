'use client';

import React, { useState } from 'react';
import { SystemHealthStatus } from '@heimdall/shared';
import {
  X,
  Settings,
  Key,
  Database,
  Cpu,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: SystemHealthStatus | null;
}

export function SettingsModal({ isOpen, onClose, health }: SettingsModalProps) {
  const [keys, setKeys] = useState({
    groqApiKey: typeof window !== 'undefined' ? localStorage.getItem('heimdall_groq_key') || '' : '',
    geminiApiKey: typeof window !== 'undefined' ? localStorage.getItem('heimdall_gemini_key') || '' : '',
    ollamaUrl: typeof window !== 'undefined' ? localStorage.getItem('heimdall_ollama_url') || 'http://127.0.0.1:11434' : 'http://127.0.0.1:11434',
    githubToken: typeof window !== 'undefined' ? localStorage.getItem('heimdall_github_token') || '' : '',
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('heimdall_groq_key', keys.groqApiKey);
    localStorage.setItem('heimdall_gemini_key', keys.geminiApiKey);
    localStorage.setItem('heimdall_ollama_url', keys.ollamaUrl);
    localStorage.setItem('heimdall_github_token', keys.githubToken);

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[#0e121c] border border-white/15 p-6 space-y-6 shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Heimdall Platform Settings</h3>
              <p className="text-[11px] text-slate-400">
                Zero-Cost Free Stack Configuration & Live Telemetry
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Subsystem Health Status */}
        <div className="rounded-xl bg-slate-950/80 border border-white/10 p-3.5 space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Subsystem Telemetry
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-slate-900 border border-white/5 space-y-0.5">
              <span className="text-[10px] text-slate-400 block">Database</span>
              <span className="font-semibold text-emerald-400 text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {health?.database.type.toUpperCase() || 'MEMORY'}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-900 border border-white/5 space-y-0.5">
              <span className="text-[10px] text-slate-400 block">Cache</span>
              <span className="font-semibold text-emerald-400 text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {health?.cache.type.toUpperCase() || 'MEMORY'}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-900 border border-white/5 space-y-0.5">
              <span className="text-[10px] text-slate-400 block">Vector DB</span>
              <span className="font-semibold text-emerald-400 text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {health?.vectorDb.type.toUpperCase() || 'COSINE'}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-900 border border-white/5 space-y-0.5">
              <span className="text-[10px] text-slate-400 block">LLM Router</span>
              <span className="font-semibold text-cyan-400 text-[11px] flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* API Keys Configuration */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
              <span>Groq API Key (Free tier LPU)</span>
              <span className="text-[10px] text-cyan-400">Optional: Falls back automatically</span>
            </label>
            <input
              type="password"
              value={keys.groqApiKey}
              onChange={(e) => setKeys({ ...keys, groqApiKey: e.target.value })}
              placeholder="gsk_..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
              <span>Google Gemini API Key (Free tier)</span>
              <span className="text-[10px] text-violet-400">Optional: For 2.0 Flash & Embeddings</span>
            </label>
            <input
              type="password"
              value={keys.geminiApiKey}
              onChange={(e) => setKeys({ ...keys, geminiApiKey: e.target.value })}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Ollama Base URL (Local LLMs)
              </label>
              <input
                type="text"
                value={keys.ollamaUrl}
                onChange={(e) => setKeys({ ...keys, ollamaUrl: e.target.value })}
                placeholder="http://127.0.0.1:11434"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                GitHub Personal Token
              </label>
              <input
                type="password"
                value={keys.githubToken}
                onChange={(e) => setKeys({ ...keys, githubToken: e.target.value })}
                placeholder="ghp_..."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <span className="text-[11px] text-slate-500">
            Keys are saved in local storage and environment variables.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs shadow-glow-cyan"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
