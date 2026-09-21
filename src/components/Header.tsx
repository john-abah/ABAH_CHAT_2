import React from 'react';
import { Bot, Database, Trash2, RefreshCw, Cpu, Globe, HardDrive } from 'lucide-react';
import { OllamaStatus } from '../types';

interface HeaderProps {
  messageCount: number;
  selectedModelId: string;
  pulledCount?: number;
  ollamaStatus: OllamaStatus | null;
  onOpenModelPicker: (initialTab?: 'online' | 'pulled') => void;
  onOpenSettings: () => void;
  onClearMemory: () => void;
  onToggleMemoryView: () => void;
  isMemoryOpen: boolean;
  isClearing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  messageCount,
  selectedModelId,
  pulledCount = 1,
  ollamaStatus,
  onOpenModelPicker,
  onOpenSettings,
  onClearMemory,
  onToggleMemoryView,
  isMemoryOpen,
  isClearing,
}) => {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md px-4 py-3 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10 overflow-hidden shrink-0">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-zinc-100 tracking-tight">ABAH CHAT</h1>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Persistent Memory
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Personal loyal companion &middot; Online Ollama Library & Local Weights
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Active Model Selector Button */}
          <button
            id="open-ollama-picker-btn"
            onClick={() => onOpenModelPicker('online')}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/80 hover:border-zinc-600 rounded-xl px-3 py-1.5 text-xs text-zinc-200 transition-all shadow-sm group"
            title="Browse all online Ollama models or switch models"
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
            <div className="flex items-center gap-1.5 font-medium">
              <span className="text-zinc-400 text-[11px] hidden sm:inline">Active:</span>
              <span className="font-mono text-zinc-100 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-[11px]">
                {selectedModelId}
              </span>
            </div>
            <span className="text-[11px] text-indigo-300 font-medium bg-indigo-950/70 hover:bg-indigo-900/80 px-2 py-0.5 rounded-lg border border-indigo-700/60 flex items-center gap-1">
              <Globe className="w-3 h-3 text-indigo-400" />
              <span>Online Library</span>
            </span>
          </button>

          {/* Pulled Models Quick Shortcut */}
          <button
            id="open-pulled-models-btn"
            onClick={() => onOpenModelPicker('pulled')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-300 transition-colors shadow-sm"
            title="View your pulled and locally available models"
          >
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Pulled:</span>
            <span className="font-mono text-[11px] text-emerald-300 font-semibold bg-zinc-900 px-1.5 py-0.2 rounded border border-zinc-800">
              {pulledCount}
            </span>
          </button>

          {/* Ollama Connection Status Button */}
          <button
            id="ollama-status-indicator-btn"
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs border transition-colors ${
              ollamaStatus?.connected
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/40'
                : 'bg-zinc-800 hover:bg-zinc-700/80 text-zinc-400 border-zinc-700/60'
            }`}
            title="Click to check Ollama host settings"
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                ollamaStatus?.connected
                  ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80'
                  : 'bg-amber-400'
              }`}
            />
            <span className="hidden sm:inline font-mono text-[11px]">
              {ollamaStatus?.connected ? 'Ollama: Online' : 'Ollama: Setup'}
            </span>
          </button>

          {/* Memory Inspector Button */}
          <button
            id="view-memory-btn"
            onClick={onToggleMemoryView}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border transition-colors ${
              isMemoryOpen
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-zinc-800 hover:bg-zinc-700/80 text-zinc-300 border-zinc-700/60'
            }`}
            title="Inspect persistent memory.json file"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Memory</span>
            <span className="bg-zinc-900/80 text-zinc-300 px-1.5 py-0.2 rounded text-[10px] font-mono">
              {messageCount}
            </span>
          </button>

          {/* Clear Memory */}
          <button
            id="clear-memory-btn"
            onClick={onClearMemory}
            disabled={isClearing || messageCount === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-xl border border-zinc-700/60 bg-zinc-800 hover:bg-red-950/40 hover:text-red-300 hover:border-red-800/50 text-zinc-400 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            title="Reset persistent conversation memory"
          >
            {isClearing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-400" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span className="hidden md:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
