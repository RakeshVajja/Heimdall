'use client';

import React, { useState } from 'react';
import { SkillDefinition } from '@heimdall/shared';
import {
  Sparkles,
  Plus,
  ShieldCheck,
  Bug,
  TestTube,
  Database,
  Compass,
  Wrench,
  Cpu,
  Trash2,
  Check,
} from 'lucide-react';

interface SkillsStudioProps {
  skills: SkillDefinition[];
  selectedSkillId?: string;
  onSelectSkill: (skill: SkillDefinition) => void;
  onCreateSkill: (skillData: Partial<SkillDefinition>) => Promise<void>;
  onDeleteSkill: (id: string) => Promise<void>;
}

export function SkillsStudio({
  skills,
  selectedSkillId,
  onSelectSkill,
  onCreateSkill,
  onDeleteSkill,
}: SkillsStudioProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [newSkill, setNewSkill] = useState<Partial<SkillDefinition>>({
    name: '',
    slug: '',
    description: '',
    category: 'coding',
    systemPrompt: '',
    allowedTools: ['filesystem', 'web_search', 'calculator'],
    preferredProvider: 'groq',
    preferredModel: 'llama-3.3-70b-versatile',
    temperature: 0.2,
  });

  const getSkillIcon = (iconName?: string) => {
    switch (iconName) {
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-cyan-400" />;
      case 'Bug':
        return <Bug className="w-5 h-5 text-rose-400" />;
      case 'TestTube':
        return <TestTube className="w-5 h-5 text-emerald-400" />;
      case 'Database':
        return <Database className="w-5 h-5 text-amber-400" />;
      case 'Compass':
        return <Compass className="w-5 h-5 text-violet-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-cyan-400" />;
    }
  };

  const filtered = filterCategory === 'all'
    ? skills
    : skills.filter((s) => s.category === filterCategory);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.name || !newSkill.systemPrompt) return;
    const slug = newSkill.slug || newSkill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await onCreateSkill({ ...newSkill, slug });
    setIsCreating(false);
    setNewSkill({
      name: '',
      slug: '',
      description: '',
      category: 'coding',
      systemPrompt: '',
      allowedTools: ['filesystem', 'web_search', 'calculator'],
      preferredProvider: 'groq',
      preferredModel: 'llama-3.3-70b-versatile',
      temperature: 0.2,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            Skills Studio
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Pre-configured cognitive personas, system prompts, tool allowlists, and model preferences.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-xs shadow-glow-violet transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Custom Skill</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {['all', 'coding', 'debugging', 'testing', 'database', 'research', 'custom'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
              filterCategory === cat
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((skill) => {
          const isSelected = skill.id === selectedSkillId;
          return (
            <div
              key={skill.id}
              className={`rounded-2xl p-4 border transition-all flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'bg-violet-950/20 border-violet-500/50 shadow-glow-violet'
                  : 'bg-slate-900/40 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-center">
                      {getSkillIcon(skill.iconName)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-wide">
                        {skill.name}
                      </h3>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-violet-400">
                        {skill.category}
                      </span>
                    </div>
                  </div>

                  {!skill.isBuiltIn && (
                    <button
                      onClick={() => onDeleteSkill(skill.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                      title="Delete custom skill"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                  {skill.description}
                </p>

                {/* Tool Permissions */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Allowed Tools
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {skill.allowedTools.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5 font-mono"
                      >
                        {t}
                      </span>
                    ))}
                    {skill.allowedTools.length === 0 && (
                      <span className="text-[10px] text-slate-500 italic">No tools restricted</span>
                    )}
                  </div>
                </div>

                {/* Preferred Model */}
                {skill.preferredProvider && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Cpu className="w-3 h-3 text-cyan-400" />
                    <span>
                      Preferred: <strong className="text-slate-200 uppercase">{skill.preferredProvider}</strong>
                      {skill.preferredModel ? ` • ${skill.preferredModel}` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={() => onSelectSkill(skill)}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'bg-slate-800 hover:bg-violet-600 text-white border border-white/10'
                }`}
              >
                {isSelected ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Active in Chat</span>
                  </>
                ) : (
                  <span>Activate Skill in Chat</span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Create Skill Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 p-6 space-y-4 shadow-2xl animate-fade-in">
            <h3 className="text-base font-bold text-white">Create New Custom Skill</h3>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Skill Name</label>
                <input
                  type="text"
                  required
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  placeholder="e.g. Next.js App Router Specialist"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={newSkill.description}
                  onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                  placeholder="Short description of what this skill does..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Category</label>
                  <select
                    value={newSkill.category}
                    onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="coding">Coding</option>
                    <option value="debugging">Debugging</option>
                    <option value="testing">Testing</option>
                    <option value="database">Database</option>
                    <option value="research">Research</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Preferred Provider</label>
                  <select
                    value={newSkill.preferredProvider}
                    onChange={(e) => setNewSkill({ ...newSkill, preferredProvider: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="groq">Groq</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="ollama">Ollama</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">System Prompt</label>
                <textarea
                  required
                  rows={4}
                  value={newSkill.systemPrompt}
                  onChange={(e) => setNewSkill({ ...newSkill, systemPrompt: e.target.value })}
                  placeholder="Detailed instructions for the AI model..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-violet-500 font-mono text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium shadow-glow-violet"
                >
                  Create Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
