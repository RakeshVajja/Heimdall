'use client';

import React, { useState } from 'react';
import { MemorySearchResult } from '@heimdall/shared';
import {
  Database,
  Search,
  Cpu,
  Layers,
  Sparkles,
  RefreshCw,
  Clock,
} from 'lucide-react';

interface MemoryExplorerProps {
  stats: { totalVectors: number; backend: string; dimensions: number } | null;
  onQueryMemory: (query: string) => Promise<MemorySearchResult[]>;
}

export function MemoryExplorer({ stats, onQueryMemory }: MemoryExplorerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemorySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await onQueryMemory(query.trim());
      setResults(res);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-white/10 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-400" />
          Semantic Vector Memory & Knowledge Explorer
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Hybrid semantic retrieval system indexing conversational interactions and user preferences with Gemini embeddings and Qdrant Cloud.
        </p>
      </div>

      {/* Vector Store Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl p-4 bg-slate-900/40 border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Total Indexed Vectors
          </span>
          <div className="text-2xl font-bold text-white">
            {stats?.totalVectors || 0}
          </div>
          <span className="text-[11px] text-cyan-400">High-dimensional embeddings</span>
        </div>

        <div className="rounded-2xl p-4 bg-slate-900/40 border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Vector Dimensions
          </span>
          <div className="text-2xl font-bold text-blue-400">
            {stats?.dimensions || 384}
          </div>
          <span className="text-[11px] text-slate-400">Dense neural embeddings</span>
        </div>

        <div className="rounded-2xl p-4 bg-slate-900/40 border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Storage Engine
          </span>
          <div className="text-2xl font-bold text-emerald-400 uppercase">
            {stats?.backend === 'qdrant_cloud' ? 'Qdrant Cloud' : 'In-Memory Cosine'}
          </div>
          <span className="text-[11px] text-emerald-400">Sub-1ms retrieval speed</span>
        </div>
      </div>

      {/* Search Console */}
      <div className="rounded-2xl bg-slate-900/40 border border-white/10 p-5 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Search className="w-4 h-4 text-cyan-400" />
          Semantic Query Console
        </h3>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a concept, question, or keyword to retrieve related semantic memories..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium text-xs shadow-glow-cyan transition-all disabled:opacity-50"
          >
            {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Semantic Search</span>
          </button>
        </form>

        {/* Results Stream */}
        <div className="space-y-3 pt-2">
          {results.map((res) => (
            <div
              key={res.id}
              className="rounded-xl border border-white/5 bg-slate-950/60 p-4 space-y-2 text-xs hover:border-cyan-500/30 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-cyan-400 font-bold text-xs">
                    Cosine Score: {Math.round(res.score * 100)}%
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-mono">
                    {res.type}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(res.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <p className="text-slate-200 text-xs leading-relaxed font-sans">
                {res.text}
              </p>
            </div>
          ))}

          {results.length === 0 && !isSearching && (
            <div className="text-center py-10 text-slate-500 text-xs">
              Enter a query above to test high-dimensional semantic search and memory retrieval.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
