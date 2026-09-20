import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  Cpu,
} from 'lucide-react';
import { OllamaStatus } from '../types';

interface OllamaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: OllamaStatus | null;
  onUpdateHost: (newHost: string) => Promise<void>;
  onRefreshStatus: () => Promise<void>;
}

export const OllamaSettingsModal: React.FC<OllamaSettingsModalProps> = ({
  isOpen,
  onClose,
  status,
  onUpdateHost,
  onRefreshStatus,
}) => {
  const [hostInput, setHostInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (status?.host) {
      setHostInput(status.host);
    } else {
      setHostInput('http://localhost:11434');
    }
  }, [status?.host]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostInput.trim()) return;
    setIsSaving(true);
    try {
      await onUpdateHost(hostInput.trim());
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshStatus();
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyCode = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div
      id="ollama-settings-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        id="ollama-settings-modal-dialog"
        className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/10"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/95">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
                Ollama Engine Settings
              </h2>
              <p className="text-xs text-zinc-400">
                Configure your local or remote Ollama daemon endpoint
              </p>
            </div>
          </div>
          <button
            id="close-ollama-settings-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Current Connection Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              status?.connected
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                : 'bg-amber-950/30 border-amber-800/50 text-amber-200'
            }`}
          >
            {status?.connected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs uppercase tracking-wider">
                  {status?.connected ? 'Ollama Connected' : 'Ollama Offline / Unreachable'}
                </span>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Check Now
                </button>
              </div>
              <p className="text-xs opacity-90">
                {status?.connected
                  ? `Running Ollama v${status.version || '0.x'} at ${status.host}. Found ${status.installedCount} installed models.`
                  : `Cannot connect to ${status?.host || hostInput}. Make sure Ollama daemon is running.`}
              </p>
            </div>
          </div>

          {/* Host Input Form */}
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>Ollama Host URL</span>
                <span className="text-[11px] font-normal text-zinc-500">
                  Default: http://localhost:11434
                </span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Server className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={hostInput}
                    onChange={(e) => setHostInput(e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5 shadow-sm"
                >
                  {isSaving ? 'Saving...' : 'Apply URL'}
                </button>
              </div>
            </div>
          </form>

          {/* Quick Setup Instructions */}
          <div className="space-y-3 border-t border-zinc-800/80 pt-4">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              Ubuntu / Linux Setup Guide
            </h3>
            <p className="text-xs text-zinc-400">
              Install and launch Ollama with CORS permissions so ABAH CHAT can interact with it:
            </p>
            <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono text-xs text-zinc-300 space-y-2 relative group">
              <div className="flex justify-between items-center text-zinc-500 border-b border-zinc-800/80 pb-1.5">
                <span>Bash Commands</span>
                <button
                  onClick={() =>
                    copyCode(
                      'curl -fsSL https://ollama.com/install.sh | sh\nOLLAMA_ORIGINS="*" ollama serve',
                      'ubuntu_cmd'
                    )
                  }
                  className="hover:text-zinc-200 flex items-center gap-1 text-[11px]"
                >
                  {copiedKey === 'ubuntu_cmd' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Copy</span>
                </button>
              </div>
              <div className="space-y-1 text-[11px] text-emerald-400">
                <div>curl -fsSL https://ollama.com/install.sh | sh</div>
                <div className="text-indigo-300">OLLAMA_ORIGINS=&quot;*&quot; ollama serve</div>
              </div>
            </div>
          </div>

          {/* Android Termux Setup */}
          <div className="space-y-2 border-t border-zinc-800/80 pt-3">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              Android (Termux / Remote)
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              If running ABAH CHAT on Android, you can point to your PC&apos;s local IP on the same Wi-Fi
              (e.g.{' '}
              <code className="text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded text-[11px]">
                http://192.168.1.50:11434
              </code>
              ) or run an on-device local proxy via Termux.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
