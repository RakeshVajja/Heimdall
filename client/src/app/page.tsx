'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Conversation,
  Message,
  SkillDefinition,
  MCPServerConfig,
  ToolDefinition,
  ModelInfo,
  SystemHealthStatus,
  ModelBenchmarkSummary,
  EvalRunResult,
  EvalTestCase,
  PromptVersion,
  AgentTrace,
  AgentStep,
  ChatStreamChunk,
  ClientApiKeys,
} from '@heimdall/shared';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

// Layout Components
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

// Chat & Agent Components
import { MessagePane } from '@/components/chat/MessagePane';
import { ChatInput } from '@/components/chat/ChatInput';
import { AgentTracePanel } from '@/components/agent/AgentTracePanel';

// Dedicated Views
import { SkillsStudio } from '@/components/skills/SkillsStudio';
import { McpHub } from '@/components/mcp/McpHub';
import { EvalDashboard } from '@/components/eval/EvalDashboard';
import { MemoryExplorer } from '@/components/memory/MemoryExplorer';
import { SettingsModal } from '@/components/settings/SettingsModal';

export default function HeimdallApp() {
  // Navigation & View State
  const [currentTab, setCurrentTab] = useState<'chat' | 'skills' | 'mcp' | 'eval' | 'memory'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Model & Provider State
  const [selectedProvider, setSelectedProvider] = useState<'groq' | 'gemini' | 'ollama' | 'mock'>('groq');
  const [selectedModel, setSelectedModel] = useState<string>('llama-3.3-70b-versatile');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [health, setHealth] = useState<SystemHealthStatus | null>(null);

  // Chat & Conversation State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState<string>('');
  const [streamingProvider, setStreamingProvider] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  // Agent Trace State
  const [activeTrace, setActiveTrace] = useState<AgentTrace | null>(null);

  // Skills & MCP State
  const [skills, setSkills] = useState<SkillDefinition[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<SkillDefinition | null>(null);
  const [mcpServers, setMcpServers] = useState<MCPServerConfig[]>([]);
  const [tools, setTools] = useState<ToolDefinition[]>([]);

  // Evals & Memory State
  const [evalSummaries, setEvalSummaries] = useState<ModelBenchmarkSummary[]>([]);
  const [evalResults, setEvalResults] = useState<EvalRunResult[]>([]);
  const [testCases, setTestCases] = useState<EvalTestCase[]>([]);
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [isEvalLoading, setIsEvalLoading] = useState(false);
  const [memoryStats, setMemoryStats] = useState<{ totalVectors: number; backend: string; dimensions: number } | null>(null);

  // Helper to extract active client API keys
  const getActiveApiKeys = (): ClientApiKeys => {
    if (typeof window === 'undefined') return {};
    return {
      groqApiKey: localStorage.getItem('heimdall_groq_key') || undefined,
      geminiApiKey: localStorage.getItem('heimdall_gemini_key') || undefined,
      ollamaBaseUrl: localStorage.getItem('heimdall_ollama_url') || undefined,
      githubToken: localStorage.getItem('heimdall_github_token') || undefined,
    };
  };

  // Load Initial Data
  useEffect(() => {
    async function loadData() {
      try {
        const [modelsList, healthStatus, convs, skillsList, serversList, toolsList, testCasesList, pVersions, memStats] =
          await Promise.all([
            api.listModels().catch(() => []),
            api.getHealth().catch(() => null),
            api.listConversations().catch(() => []),
            api.listSkills().catch(() => []),
            api.listMcpServers().catch(() => []),
            api.listTools().catch(() => []),
            api.getTestCases().catch(() => []),
            api.listPromptVersions().catch(() => []),
            api.getMemoryStats().catch(() => null),
          ]);

        setModels(modelsList);
        setHealth(healthStatus);
        setConversations(convs);
        setSkills(skillsList);
        setMcpServers(serversList);
        setTools(toolsList);
        setTestCases(testCasesList);
        setPromptVersions(pVersions);
        setMemoryStats(memStats);

        if (convs.length > 0 && !activeConversationId) {
          setActiveConversationId(convs[0].id);
          const detail = await api.getConversation(convs[0].id);
          setMessages(detail.messages);
        }
      } catch (err) {
        console.error('[Heimdall] Error loading initial workspace data:', err);
      }
    }

    loadData();
  }, []);

  // Socket.IO real-time event subscriptions
  useEffect(() => {
    const socket = getSocket();

    socket.on('chat:chunk', (chunk: ChatStreamChunk) => {
      setStreamingText(chunk.accumulated);
      setIsStreaming(true);
    });

    socket.on('chat:complete', (data: { conversationId: string; message: Message }) => {
      setMessages((prev) => [...prev, data.message]);
      setStreamingText('');
      setIsStreaming(false);

      // Refresh conversations list to update snippet/count
      api.listConversations().then(setConversations).catch(() => {});
    });

    socket.on('chat:error', (data: { error: string }) => {
      console.error('[Socket] Chat error:', data.error);
      setIsStreaming(false);
      setStreamingText('');
    });

    // Autonomous Agent events
    socket.on('agent:step', (data: { step: AgentStep }) => {
      setActiveTrace((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          steps: [...prev.steps.filter((s) => s.id !== data.step.id), data.step],
        };
      });
    });

    socket.on('agent:trace', (data: { trace: AgentTrace }) => {
      setActiveTrace(data.trace);
    });

    socket.on('agent:complete', (data: { message: Message; trace: AgentTrace }) => {
      setMessages((prev) => [...prev, data.message]);
      setActiveTrace(data.trace);
      setIsStreaming(false);
      api.listConversations().then(setConversations).catch(() => {});
    });

    socket.on('agent:error', (data: { error: string }) => {
      console.error('[Socket] Agent error:', data.error);
      setIsStreaming(false);
    });

    return () => {
      socket.off('chat:chunk');
      socket.off('chat:complete');
      socket.off('chat:error');
      socket.off('agent:step');
      socket.off('agent:trace');
      socket.off('agent:complete');
      socket.off('agent:error');
    };
  }, []);

  // Conversation Selection
  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id);
    try {
      const data = await api.getConversation(id);
      setMessages(data.messages);
    } catch (err) {
      console.error('[Heimdall] Failed to load conversation:', err);
    }
  };

  // Create New Conversation
  const handleNewConversation = async () => {
    try {
      const conv = await api.createConversation({
        title: `Agent Session ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        provider: selectedProvider,
        model: selectedModel,
        skillId: selectedSkill?.id,
      });
      setConversations((prev) => [conv, ...prev]);
      setActiveConversationId(conv.id);
      setMessages([]);
      setCurrentTab('chat');
    } catch (err) {
      console.error('[Heimdall] Failed to create new conversation:', err);
    }
  };

  // Delete Conversation
  const handleDeleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(undefined);
        setMessages([]);
      }
    } catch (err) {
      console.error('[Heimdall] Failed to delete conversation:', err);
    }
  };

  // Pin Conversation
  const handlePinConversation = async (id: string, isPinned: boolean) => {
    try {
      const updated = await api.updateConversation(id, { isPinned });
      setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      console.error('[Heimdall] Failed to pin conversation:', err);
    }
  };

  // Send Message / Execute Agent
  const handleSendMessage = async (content: string, isAgentMode: boolean) => {
    let convId = activeConversationId;
    if (!convId) {
      const conv = await api.createConversation({
        title: content.slice(0, 30),
        provider: selectedProvider,
        model: selectedModel,
        skillId: selectedSkill?.id,
      });
      setConversations((prev) => [conv, ...prev]);
      setActiveConversationId(conv.id);
      convId = conv.id;
    }

    const userMessage: Message = {
      id: 'msg_temp_' + Date.now(),
      conversationId: convId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingText('');
    setStreamingProvider(selectedProvider);

    const socket = getSocket();
    const apiKeys = getActiveApiKeys();

    if (isAgentMode) {
      // Initialize active trace
      const initialTrace: AgentTrace = {
        id: 'trace_' + Date.now(),
        conversationId: convId,
        userPrompt: content,
        steps: [],
        totalSteps: 0,
        totalLatencyMs: 0,
        status: 'running',
        startTime: new Date().toISOString(),
      };
      setActiveTrace(initialTrace);

      socket.emit('agent:run', {
        prompt: content,
        conversationId: convId,
        apiKeys,
        config: {
          provider: selectedProvider,
          model: selectedModel,
          skillId: selectedSkill?.id,
          maxSteps: 10,
        },
      });
    } else {
      socket.emit('chat:send', {
        conversationId: convId,
        content,
        provider: selectedProvider,
        model: selectedModel,
        skillId: selectedSkill?.id,
        apiKeys,
      });
    }
  };

  // Run Benchmark Test in Evaluations View
  const handleRunBenchmark = async (providers: string[], category?: string) => {
    setIsEvalLoading(true);
    try {
      const res = await api.runBenchmark(providers, category);
      setEvalSummaries(res.summaries);
      setEvalResults((prev) => [...res.detailedResults, ...prev]);
    } catch (err) {
      console.error('[Heimdall] Benchmark run failed:', err);
    } finally {
      setIsEvalLoading(false);
    }
  };

  // MCP Actions
  const handleConnectMcp = async (id: string) => {
    const res = await api.connectMcpServer(id);
    setMcpServers((prev) => prev.map((s) => (s.id === id ? res.server : s)));
    const updatedTools = await api.listTools();
    setTools(updatedTools);
  };

  const handleDisconnectMcp = async (id: string) => {
    const res = await api.disconnectMcpServer(id);
    setMcpServers((prev) => prev.map((s) => (s.id === id ? res.server : s)));
    const updatedTools = await api.listTools();
    setTools(updatedTools);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#07090e] text-slate-100 font-sans">
      {/* Top Navigation Bar */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        selectedProvider={selectedProvider}
        onProviderChange={setSelectedProvider}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        models={models}
        health={health}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Sidebar (shown only in Chat tab) */}
        {currentTab === 'chat' && (
          <Sidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
            onPinConversation={handlePinConversation}
            onSearch={api.searchConversations}
            isOpen={isSidebarOpen}
          />
        )}

        {/* View Switcher Router */}
        <main className="flex-1 flex overflow-hidden relative">
          {currentTab === 'chat' && (
            <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] relative overflow-hidden">
              <MessagePane
                messages={messages}
                streamingText={streamingText}
                streamingProvider={streamingProvider}
                isStreaming={isStreaming}
                onOpenTrace={(trace) => setActiveTrace(trace)}
              />
              <ChatInput
                onSendMessage={handleSendMessage}
                isStreaming={isStreaming}
                onStopStreaming={() => setIsStreaming(false)}
                selectedSkill={selectedSkill}
                onClearSkill={() => setSelectedSkill(null)}
              />
            </div>
          )}

          {currentTab === 'skills' && (
            <SkillsStudio
              skills={skills}
              selectedSkillId={selectedSkill?.id}
              onSelectSkill={(skill) => {
                setSelectedSkill(skill);
                setCurrentTab('chat');
              }}
              onCreateSkill={async (skillData) => {
                const created = await api.createSkill(skillData);
                setSkills((prev) => [...prev, created]);
              }}
              onDeleteSkill={async (id) => {
                await api.deleteSkill(id);
                setSkills((prev) => prev.filter((s) => s.id !== id));
              }}
            />
          )}

          {currentTab === 'mcp' && (
            <McpHub
              servers={mcpServers}
              tools={tools}
              onConnectServer={handleConnectMcp}
              onDisconnectServer={handleDisconnectMcp}
              onExecuteTool={api.executeTool}
            />
          )}

          {currentTab === 'eval' && (
            <EvalDashboard
              summaries={evalSummaries}
              results={evalResults}
              testCases={testCases}
              promptVersions={promptVersions}
              onRunBenchmark={handleRunBenchmark}
              isLoading={isEvalLoading}
            />
          )}

          {currentTab === 'memory' && (
            <MemoryExplorer
              stats={memoryStats}
              onQueryMemory={api.queryMemory}
            />
          )}

          {/* Autonomous Agent Trace Drawer / Panel */}
          {activeTrace && (
            <AgentTracePanel
              trace={activeTrace}
              onClose={() => setActiveTrace(null)}
            />
          )}
        </main>
      </div>

      {/* Platform Settings & Telemetry Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        health={health}
      />
    </div>
  );
}
