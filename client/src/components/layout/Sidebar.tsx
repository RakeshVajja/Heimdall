'use client';

import React, { useState } from 'react';
import { Conversation, MemorySearchResult } from '@heimdall/shared';
import {
  Plus,
  Search,
  MessageSquare,
  Pin,
  Trash2,
  Cpu,
  Clock,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onPinConversation: (id: string, isPinned: boolean) => void;
  onSearch: (query: string) => Promise<MemorySearchResult[]>;
  isOpen?: boolean;
}

export function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onPinConversation,
  onSearch,
  isOpen = true,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemorySearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const results = await onSearch(searchQuery.trim());
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  const pinned = conversations.filter((c) => c.isPinned);
  const unpinned = conversations.filter((c) => !c.isPinned);

  return (
    <aside
      className={`w-72 bg-[#090b11] border-r border-white/10 flex flex-col h-[calc(100vh-3.5rem)] transition-all z-20 ${
        isOpen ? 'block' : 'hidden md:flex'
      }`}
    >
      {/* Top Action: New Chat */}
      <div className="p-3 border-b border-white/5 space-y-2">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs shadow-glow-cyan transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Agent Conversation</span>
        </button>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hybrid search messages..."
            className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-slate-950/80 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2 top-2 text-slate-500 hover:text-white text-xs"
            >
              ×
            </button>
          )}
        </form>
      </div>

      {/* Conversations List / Search Results */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4 text-xs">
        {searchResults !== null ? (
          /* Search results view */
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-cyan-400">
              <span>Search Hits ({searchResults.length})</span>
              <button onClick={handleClearSearch} className="text-slate-400 hover:text-white">
                Clear
              </button>
            </div>
            {searchResults.map((res) => (
              <div
                key={res.id}
                onClick={() => res.conversationId && onSelectConversation(res.conversationId)}
                className="p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-white/5 cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="text-cyan-300 font-mono">Score: {Math.round(res.score * 100)}%</span>
                  <span>{new Date(res.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-slate-200 line-clamp-2">{res.text}</p>
              </div>
            ))}
            {searchResults.length === 0 && (
              <p className="text-center text-slate-500 py-6 text-xs">No matching messages found.</p>
            )}
          </div>
        ) : (
          /* Regular conversation list */
          <>
            {/* Pinned Chats */}
            {pinned.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/80 px-2.5 block">
                  Pinned ({pinned.length})
                </span>
                {pinned.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isActive={conv.id === activeConversationId}
                    onSelect={() => onSelectConversation(conv.id)}
                    onDelete={() => onDeleteConversation(conv.id)}
                    onPin={() => onPinConversation(conv.id, false)}
                  />
                ))}
              </div>
            )}

            {/* Recent Chats */}
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-2.5 block">
                Recent ({unpinned.length})
              </span>
              {unpinned.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isActive={conv.id === activeConversationId}
                  onSelect={() => onSelectConversation(conv.id)}
                  onDelete={() => onDeleteConversation(conv.id)}
                  onPin={() => onPinConversation(conv.id, true)}
                />
              ))}
              {conversations.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No conversations yet.<br />Start a new conversation above.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

function ConversationItem({
  conv,
  isActive,
  onSelect,
  onDelete,
  onPin,
}: {
  conv: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onPin: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
        isActive
          ? 'bg-slate-800/90 text-white border border-cyan-500/40 shadow-sm'
          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
        <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
        <div className="min-w-0 flex-1">
          <span className="block text-xs font-medium truncate">{conv.title}</span>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
            <span className="font-mono text-[9px] uppercase text-cyan-400/80">{conv.provider}</span>
            <span>•</span>
            <span>{conv.messageCount || 0} msgs</span>
          </div>
        </div>
      </div>

      {/* Hover action buttons */}
      <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPin();
          }}
          className={`p-1 rounded hover:bg-slate-700 ${conv.isPinned ? 'text-amber-400' : 'text-slate-400'}`}
          title={conv.isPinned ? 'Unpin' : 'Pin conversation'}
        >
          <Pin className="w-3 h-3" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded hover:bg-rose-950/40 text-slate-400 hover:text-rose-400"
          title="Delete conversation"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
