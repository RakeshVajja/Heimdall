'use client';

import React, { useState } from 'react';
import { MCPServerConfig, ToolDefinition, ToolResult } from '@heimdall/shared';
import {
  Shield,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  FolderTree,
  Github,
  Globe,
  Radio,
  RefreshCw,
  Wrench,
} from 'lucide-react';

interface McpHubProps {
  servers: MCPServerConfig[];
  tools: ToolDefinition[];
  onConnectServer: (id: string) => Promise<void>;
  onDisconnectServer: (id: string) => Promise<void>;
  onExecuteTool: (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
}

export function McpHub({
  servers,
  tools,
  onConnectServer,
  onDisconnectServer,
  onExecuteTool,
}: McpHubProps) {
  const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(null);
  const [toolArgsInput, setToolArgsInput] = useState<string>('{}');
  const [toolExecutionResult, setToolExecutionResult] = useState<ToolResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [loadingServerId, setLoadingServerId] = useState<string | null>(null);

  const getServerIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('file')) return <FolderTree className="w-5 h-5 text-cyan-400" />;
    if (lower.includes('github')) return <Github className="w-5 h-5 text-violet-400" />;
    return <Globe className="w-5 h-5 text-emerald-400" />;
  };

  const handleToolClick = (tool: ToolDefinition) => {
    setSelectedTool(tool);
    setToolExecutionResult(null);

    // Pre-populate sample JSON from parameter schema
    const defaultArgs: Record<string, unknown> = {};
    if (tool.parameters?.properties) {
      for (const [key, val] of Object.entries(tool.parameters.properties as Record<string, any>)) {
        if (key === 'path') defaultArgs[key] = 'sandbox_test.txt';
        else if (key === 'content') defaultArgs[key] = 'Hello from Heimdall MCP!';
        else if (key === 'operation') defaultArgs[key] = 'write';
        else if (key === 'query') defaultArgs[key] = 'TypeScript AI agents';
        else if (key === 'owner') defaultArgs[key] = 'facebook';
        else if (key === 'repo') defaultArgs[key] = 'react';
        else if (key === 'expression') defaultArgs[key] = 'sqrt(144) + 42';
        else defaultArgs[key] = val.default || '';
      }
    }
    setToolArgsInput(JSON.stringify(defaultArgs, null, 2));
  };

  const handleExecuteTool = async () => {
    if (!selectedTool) return;
    setIsExecuting(true);
    try {
      const parsedArgs = JSON.parse(toolArgsInput);
      const res = await onExecuteTool(selectedTool.name, parsedArgs);
      setToolExecutionResult(res);
    } catch (err: unknown) {
      setToolExecutionResult({
        success: false,
        output: null,
        error: err instanceof Error ? err.message : 'Invalid JSON input',
        executionTimeMs: 0,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-white/10 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          Model Context Protocol (MCP) Hub
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Standard JSON-RPC 2.0 protocol ecosystem connecting external tool servers, resources, and sandboxes into Heimdall's unified tool engine.
        </p>
      </div>

      {/* Server Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {servers.map((server) => {
          const isConnected = server.status === 'connected';
          return (
            <div
              key={server.id}
              className={`rounded-2xl p-4 border transition-all space-y-3 ${
                isConnected
                  ? 'bg-slate-900/60 border-emerald-500/30 shadow-glow-emerald'
                  : 'bg-slate-900/40 border-white/10'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center">
                    {getServerIcon(server.name)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{server.name}</h3>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                      Transport: {server.transport}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                    isConnected
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-white/10'
                  }`}
                >
                  {server.status.toUpperCase()}
                </span>
              </div>

              <p className="text-xs text-slate-300 line-clamp-2">
                {server.description || 'MCP protocol server provider.'}
              </p>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
                <span className="font-mono text-[11px] text-cyan-300">
                  {server.discoveredToolsCount || 0} Tools Discovered
                </span>

                <button
                  disabled={loadingServerId === server.id}
                  onClick={async () => {
                    setLoadingServerId(server.id);
                    if (isConnected) {
                      await onDisconnectServer(server.id);
                    } else {
                      await onConnectServer(server.id);
                    }
                    setLoadingServerId(null);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    isConnected
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-glow-emerald'
                  }`}
                >
                  {loadingServerId === server.id ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : isConnected ? (
                    'Disconnect'
                  ) : (
                    'Connect'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Discovered Tools & Live Execution Sandbox Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Left: Tools List */}
        <div className="rounded-2xl bg-slate-900/40 border border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-cyan-400" />
              Unified Tool Engine ({tools.length} Tools)
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Native & MCP Unified
            </span>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {tools.map((tool) => {
              const isSelected = selectedTool?.name === tool.name;
              return (
                <div
                  key={tool.name}
                  onClick={() => handleToolClick(tool)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1 ${
                    isSelected
                      ? 'bg-cyan-950/30 border-cyan-500/50 shadow-glow-cyan'
                      : 'bg-slate-950/60 border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-cyan-300">
                      {tool.name}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-mono ${
                        tool.source === 'mcp'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      }`}
                    >
                      {tool.source}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {tool.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Tool Sandbox Tester */}
        <div className="rounded-2xl bg-slate-900/40 border border-white/10 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400" />
                Live Tool Execution Sandbox
              </h3>
              {selectedTool && (
                <span className="font-mono text-xs text-cyan-400">
                  {selectedTool.name}
                </span>
              )}
            </div>

            {selectedTool ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  {selectedTool.description}
                </p>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    JSON Input Arguments
                  </label>
                  <textarea
                    rows={4}
                    value={toolArgsInput}
                    onChange={(e) => setToolArgsInput(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-black/60 border border-white/10 text-emerald-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  disabled={isExecuting}
                  onClick={handleExecuteTool}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs shadow-glow-emerald transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isExecuting ? 'Executing in Sandbox...' : 'Run Tool in Sandbox'}</span>
                </button>

                {/* Execution Output */}
                {toolExecutionResult && (
                  <div className="rounded-xl bg-black/70 border border-white/10 p-3 space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span
                        className={`font-semibold ${
                          toolExecutionResult.success ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {toolExecutionResult.success ? '✓ SUCCESS' : '✕ ERROR'}
                      </span>
                      <span className="text-slate-500">
                        {toolExecutionResult.executionTimeMs}ms
                      </span>
                    </div>
                    <pre className="text-slate-200 overflow-x-auto max-h-40 m-0 leading-relaxed text-[11px]">
                      {toolExecutionResult.error || JSON.stringify(toolExecutionResult.output, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 text-xs">
                Select a tool on the left to test and inspect its input schema and live output.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
