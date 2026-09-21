import React, { useState } from 'react';
import {
  X,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Play,
  DownloadCloud,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { OllamaStatus } from '../types';

interface OllamaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: OllamaStatus | null;
  onUpdateHost: (host: string) => Promise<void> | void;
  onRefreshStatus: () => Promise<void> | void;
}

export function OllamaSettingsModal({
  isOpen,
  onClose,
  status,
  onUpdateHost,
  onRefreshStatus,
}: OllamaSettingsModalProps) {
  const [hostInput, setHostInput] = useState<string>(status?.host || 'http://localhost:11434');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostInput.trim()) return;
    setIsSaving(true);
    setActionMessage(null);
    try {
      await onUpdateHost(hostInput.trim());
      setActionMessage('Ollama endpoint saved successfully');
    } catch {
      setActionMessage('Failed to update Ollama endpoint');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoStart = async () => {
    setIsStarting(true);
    setActionMessage('Attempting to start Ollama daemon...');
    try {
      const res = await fetch('/api/ollama/autostart', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || 'Ollama daemon started successfully');
        await onRefreshStatus();
      } else {
        setActionMessage(data.error || 'Failed to auto-start Ollama');
      }
    } catch {
      setActionMessage('Could not connect to backend to start Ollama');
    } finally {
      setIsStarting(false);
    }
  };

  const handleAutoInstall = async () => {
    setIsStarting(true);
    setActionMessage('Installing Ollama service...');
    try {
      const res = await fetch('/api/ollama/autoinstall', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || 'Ollama installation triggered');
        setTimeout(() => onRefreshStatus(), 3000);
      } else {
        setActionMessage(data.error || 'Failed to auto-install Ollama');
      }
    } catch {
      setActionMessage('Could not connect to backend to install Ollama');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div
      id="ollama-settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Ollama Service Settings</h2>
              <p className="text-xs text-zinc-400">Configure connection and daemon auto-start</p>
            </div>
          </div>
          <button
            id="close-settings-button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Status Badge */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              status?.connected
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                : 'bg-zinc-800/40 border-zinc-700 text-zinc-300'
            }`}
          >
            {status?.connected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs space-y-1">
              <div className="font-semibold flex items-center gap-2 text-sm">
                <span>{status?.connected ? 'Ollama Daemon Active & Connected' : 'Ollama Offline or Unreachable'}</span>
                {status?.version && (
                  <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 rounded font-mono">
                    v{status.version}
                  </span>
                )}
              </div>
              <p className="text-zinc-400">
                {status?.connected
                  ? `Successfully responding on ${status.host} with ${status.installedCount} models currently loaded.`
                  : `Cannot reach Ollama on ${status?.host || 'http://localhost:11434'}. Ensure the daemon is running.`}
              </p>
            </div>
            <button
              id="refresh-status-button"
              onClick={onRefreshStatus}
              title="Refresh status"
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Service Auto-Start & Auto-Install Controls */}
          <div className="bg-zinc-950/60 rounded-xl p-4 border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                Automatic Daemon Controls
              </span>
              <span className="text-xs text-zinc-500">Requirement 4</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              If Ollama is installed on this host or machine, you can auto-start it with a single click. If it does not exist, the app can install it automatically.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                id="autostart-ollama-button"
                onClick={handleAutoStart}
                disabled={isStarting}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg transition disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-indigo-300" />
                {isStarting ? 'Starting Ollama...' : 'Auto-Start Ollama Daemon'}
              </button>
              <button
                id="autoinstall-ollama-button"
                onClick={handleAutoInstall}
                disabled={isStarting}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg transition disabled:opacity-50"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                Install Ollama Engine
              </button>
            </div>
          </div>

          {/* Action Message feedback */}
          {actionMessage && (
            <div className="text-xs p-3 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{actionMessage}</span>
            </div>
          )}

          {/* Connection Host Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="ollama-host-input" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Ollama Host URL
              </label>
              <input
                id="ollama-host-input"
                type="text"
                value={hostInput}
                onChange={(e) => setHostInput(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-mono"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Default is <code className="text-zinc-400 font-mono">http://localhost:11434</code>. For remote machines, use their LAN IP (e.g., <code className="text-zinc-400 font-mono">http://192.168.1.100:11434</code>).
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setHostInput('http://localhost:11434')}
                className="text-xs text-zinc-400 hover:text-zinc-200 underline underline-offset-2"
              >
                Reset to default (localhost:11434)
              </button>
              <button
                id="save-host-button"
                type="submit"
                disabled={isSaving || hostInput.trim() === status?.host}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                Save & Connect
              </button>
            </div>
          </form>

          {/* Quick Terminal Guide */}
          <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
              <Terminal className="w-4 h-4 text-zinc-400" />
              <span>Manual Terminal Quick-Start</span>
            </div>
            <div className="bg-zinc-900 rounded-lg p-2.5 font-mono text-xs text-amber-300 select-all overflow-x-auto">
              curl -fsSL https://ollama.com/install.sh | sh && ollama serve
            </div>
            <p className="text-[11px] text-zinc-500">
              For remote LAN access, launch with: <code className="text-zinc-400 font-mono">OLLAMA_HOST=0.0.0.0 ollama serve</code>
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <a
            href="https://ollama.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition"
          >
            <span>Visit Ollama.com</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            id="close-settings-footer-button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
