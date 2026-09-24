import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';
import { MemoryInspector } from './components/MemoryInspector';
import { ImportChatModal } from './components/ImportChatModal';
import { OllamaModelPicker } from './components/OllamaModelPicker';
import { OllamaSettingsModal } from './components/OllamaSettingsModal';
import {
  MemoryState,
  OllamaStatus,
  PulledOllamaModel,
  PullProgress,
  ChatAttachment,
  SharedChatConversation,
} from './types';
import {
  AlertCircle,
  CheckCircle2,
  DownloadCloud,
  Check,
  Cpu,
  Loader2,
  Sparkles,
  Terminal,
  RefreshCw,
  X,
} from 'lucide-react';

// Play a gentle notification sound when a model finishes downloading
const playCompletionChime = () => {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // 2-tone melodic chime: C5 (523.25Hz) -> G5 (783.99Hz)
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.14);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.65);
  } catch {
    // Audio Context might require prior interaction in strict browsers
  }
};

export default function App() {
  const [memory, setMemory] = useState<MemoryState | null>(null);
  // Default to empty string; will be resolved dynamically from pulled models
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('abah_selected_model') || '';
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState<boolean>(false);
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState<boolean>(false);
  const [modelPickerTab, setModelPickerTab] = useState<'online' | 'pulled'>('online');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [pulledModels, setPulledModels] = useState<PulledOllamaModel[]>([]);

  // Active download tracking & completed download alert
  const [activeDownloads, setActiveDownloads] = useState<Record<string, PullProgress>>({});
  const [completedModelAlert, setCompletedModelAlert] = useState<{
    model: string;
    completedAt: string;
  } | null>(null);
  const prevPullsRef = useRef<Record<string, boolean>>({});

  // Ollama background daemon state
  const [daemonState, setDaemonState] = useState<{
    status: 'idle' | 'checking' | 'downloading' | 'starting' | 'running' | 'error';
    message: string;
    version: string | null;
    isDownloading?: boolean;
    isStarting?: boolean;
    error?: string;
  }>({
    status: 'idle',
    message: '',
    version: null,
  });

  // Fetch persistent conversation memory
  const fetchMemory = useCallback(async () => {
    try {
      const res = await fetch('/api/memory');
      if (res.ok) {
        const data = await res.json();
        setMemory(data);
      }
    } catch (err) {
      console.error('Failed to load memory:', err);
    }
  }, []);

  // Fetch Ollama connection status
  const fetchOllamaStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/ollama/status');
      if (res.ok) {
        const data = (await res.json()) as OllamaStatus;
        setOllamaStatus(data);
      }
    } catch (err) {
      console.warn('Ollama status check failed:', err);
    }
  }, []);

  // Fetch pulled models list and sync selectedModel
  const fetchPulledModels = useCallback(async () => {
    try {
      const res = await fetch('/api/ollama/pulled');
      if (res.ok) {
        const data = await res.json();
        const models: PulledOllamaModel[] = data.models || [];
        setPulledModels(models);

        setSelectedModel((current) => {
          // If we have models available
          if (models.length > 0) {
            // Check if current is one of the pulled models
            const valid = models.some(
              (m) => m.id.toLowerCase() === (current || '').toLowerCase()
            );
            if (current && valid) {
              return current;
            }
            // Auto-select the first pulled model
            const fallback = models[0].id;
            localStorage.setItem('abah_selected_model', fallback);
            return fallback;
          } else {
            // No models pulled at all: do not set any default
            localStorage.removeItem('abah_selected_model');
            return '';
          }
        });
      }
    } catch (err) {
      console.warn('Failed to load pulled models:', err);
    }
  }, []);

  // Poll daemon status
  const fetchDaemonStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/ollama/daemon-status');
      if (res.ok) {
        const data = await res.json();
        setDaemonState(data);
        if (data.status === 'running') {
          fetchOllamaStatus();
        }
      }
    } catch (err) {
      console.warn('Failed to check daemon status:', err);
    }
  }, [fetchOllamaStatus]);

  // Poll active model downloads and check for completion
  const pollActiveDownloads = useCallback(async () => {
    try {
      const res = await fetch('/api/ollama/pulls/active');
      if (res.ok) {
        const data = await res.json();
        const pulls: Record<string, PullProgress> = data.activePulls || {};
        setActiveDownloads(pulls);

        // Check each model's progress to alert user when finished
        for (const [modelKey, progress] of Object.entries(pulls)) {
          const wasPulling = prevPullsRef.current[modelKey];
          const isDoneNow = Boolean(
            progress.isDone || (progress.percent !== undefined && progress.percent >= 100)
          );

          if (wasPulling && isDoneNow) {
            // Download just transitioned to finished!
            playCompletionChime();
            setCompletedModelAlert({
              model: modelKey,
              completedAt: new Date().toLocaleTimeString(),
            });

            // Refresh models list
            fetchPulledModels();
            fetchOllamaStatus();

            // Auto-select if no model was selected
            setSelectedModel((current) => {
              if (!current) {
                localStorage.setItem('abah_selected_model', modelKey);
                return modelKey;
              }
              return current;
            });
          }

          // Update tracking ref
          if (!isDoneNow) {
            prevPullsRef.current[modelKey] = true;
          } else {
            prevPullsRef.current[modelKey] = false;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to poll active downloads:', err);
    }
  }, [fetchPulledModels, fetchOllamaStatus]);

  // Initial load
  useEffect(() => {
    fetchMemory();
    fetchOllamaStatus();
    fetchPulledModels();
    fetchDaemonStatus();
  }, [fetchMemory, fetchOllamaStatus, fetchPulledModels, fetchDaemonStatus]);

  // Periodic daemon & download polling
  useEffect(() => {
    const hasActivePulls = Object.values(activeDownloads).some((p) => !p.isDone);
    const daemonBusy = daemonState.isDownloading || daemonState.isStarting;

    const intervalTime = hasActivePulls ? 1200 : daemonBusy ? 2500 : 5000;

    const interval = setInterval(() => {
      pollActiveDownloads();
      if (daemonBusy || !ollamaStatus?.connected) {
        fetchDaemonStatus();
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [activeDownloads, daemonState, ollamaStatus, pollActiveDownloads, fetchDaemonStatus]);

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    if (modelId) {
      localStorage.setItem('abah_selected_model', modelId);
      setSuccessNotice(`Switched active chatter model to "${modelId}"`);
    } else {
      localStorage.removeItem('abah_selected_model');
    }
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const handleOpenModelPicker = (tab: 'online' | 'pulled' = 'online') => {
    setModelPickerTab(tab);
    setIsModelPickerOpen(true);
  };

  const handleUpdateHost = async (newHost: string) => {
    try {
      const res = await fetch('/api/ollama/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: newHost }),
      });
      if (res.ok) {
        const data = await res.json();
        setOllamaStatus({
          connected: data.connected,
          host: data.host,
          version: data.version,
          installedCount: data.installedCount,
          error: data.error,
        });
        fetchPulledModels();
        setSuccessNotice(`Ollama host updated to ${data.host}`);
        setTimeout(() => setSuccessNotice(null), 3000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update Ollama host';
      setErrorNotice(msg);
    }
  };

  const handleSendMessage = async (
    text: string,
    attachments?: ChatAttachment[],
    webSearch?: boolean,
    sharedChat?: SharedChatConversation
  ) => {
    if (!text.trim() && (!attachments || attachments.length === 0) && !sharedChat) return;

    // Check if model is selected
    if (!selectedModel) {
      setErrorNotice(
        'No AI model is selected. Please pull or select a model first from the Ollama library.'
      );
      handleOpenModelPicker(pulledModels.length > 0 ? 'pulled' : 'online');
      return;
    }

    setErrorNotice(null);
    setIsLoading(true);

    // Optimistically append the user's message to UI
    const optimisticTimestamp = new Date().toISOString();
    setMemory((prev) => {
      const prevMessages = prev?.llm_context?.messages || [];
      return {
        type: 'AssistantAgentState',
        version: prev?.version || '1.0.0',
        llm_context: {
          messages: [
            ...prevMessages,
            {
              content:
                text ||
                (sharedChat
                  ? `Analyze shared chat: "${sharedChat.title}" (${sharedChat.provider})`
                  : ''),
              source: 'user',
              type: 'UserMessage',
              timestamp: optimisticTimestamp,
              attachments: attachments && attachments.length > 0 ? attachments : undefined,
            },
          ],
        },
      };
    });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          model: selectedModel,
          attachments,
          webSearch,
          sharedChat,
          clientTime: new Date().toISOString(),
          clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      if (data.memory) {
        setMemory(data.memory);
      }
    } catch (err: unknown) {
      console.error('Chat error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to send message. Please try again.';
      setErrorNotice(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportSuccess = (newMemory: MemoryState, count: number) => {
    setMemory(newMemory);
    setSuccessNotice(
      `Successfully imported ${count} message${count === 1 ? '' : 's'} into persistent memory.`
    );
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  const handleClearMemory = async () => {
    if (!window.confirm('Reset persistent memory and clear all conversation history?')) {
      return;
    }

    setIsClearing(true);
    try {
      const res = await fetch('/api/memory/clear', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setMemory(data.memory);
        setSuccessNotice('Persistent conversation memory cleared.');
        setTimeout(() => setSuccessNotice(null), 3000);
      }
    } catch (err) {
      console.error('Failed to clear memory:', err);
    } finally {
      setIsClearing(false);
    }
  };

  const currentMessages = memory?.llm_context?.messages || [];
  const inProgressPulls = Object.entries(activeDownloads).filter(
    ([, progress]) => !progress.isDone && (progress.percent === undefined || progress.percent < 100)
  );

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Header */}
      <Header
        messageCount={currentMessages.length}
        selectedModelId={selectedModel}
        pulledCount={pulledModels.length}
        ollamaStatus={ollamaStatus}
        onOpenModelPicker={handleOpenModelPicker}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onClearMemory={handleClearMemory}
        onToggleMemoryView={() => setIsMemoryOpen((v) => !v)}
        onOpenImport={() => setIsImportOpen(true)}
        isMemoryOpen={isMemoryOpen}
        isClearing={isClearing}
      />

      {/* Ollama Daemon Auto-Setup Banner */}
      {(daemonState.isDownloading || daemonState.isStarting) && (
        <div className="bg-gradient-to-r from-indigo-950/90 via-blue-950/90 to-purple-950/90 border-b border-indigo-700/60 px-4 py-2 text-xs flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
            <div className="flex-1 flex items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-indigo-200">
                  {daemonState.isDownloading
                    ? 'Ollama Engine Auto-Install: '
                    : 'Ollama Daemon Starting: '}
                </span>
                <span className="text-zinc-300">
                  {daemonState.message || 'Ensuring Ollama daemon is running in background...'}
                </span>
              </div>
              <span className="text-[11px] text-indigo-300 font-mono hidden md:inline">
                Please wait &bull; Auto-configuring
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Active Model Downloads Banner: Clear indication to wait while downloading */}
      {inProgressPulls.length > 0 && (
        <div className="bg-amber-950/90 border-b border-amber-800/80 px-4 py-2.5 shadow-lg animate-in slide-in-from-top-1">
          <div className="max-w-4xl mx-auto w-full space-y-2">
            {inProgressPulls.map(([modelName, progress]) => {
              const pct = progress.percent ?? 0;
              return (
                <div key={modelName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-amber-200">
                    <div className="flex items-center gap-2">
                      <DownloadCloud className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
                      <span className="font-semibold text-amber-100 font-mono">{modelName}</span>
                      <span className="text-amber-300/90 text-[11px]">
                        &mdash; ⏳ Downloading model weights... Please wait, it will notify you when done.
                      </span>
                    </div>
                    <span className="font-mono font-bold text-amber-300">{pct}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-amber-700/50">
                    <div
                      className="bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-amber-300/80 font-mono">
                    <span>
                      {progress.status || 'Streaming layers from registry...'}
                      {progress.completed && progress.total && (
                        <>
                          {' '}
                          ({(progress.completed / 1024 / 1024).toFixed(0)} MB /{' '}
                          {(progress.total / 1024 / 1024 / 1024).toFixed(1)} GB)
                        </>
                      )}
                    </span>
                    <button
                      onClick={() => handleOpenModelPicker('online')}
                      className="underline text-amber-200 hover:text-white"
                    >
                      View Live Downloader
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Download Completed Alert Banner: Notifies user when finished */}
      {completedModelAlert && (
        <div className="bg-emerald-950/95 border-b border-emerald-600 px-4 py-3 shadow-xl animate-in zoom-in-95 duration-200">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 text-xs text-emerald-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-emerald-100 text-sm flex items-center gap-2">
                  <span>🎉 Download Complete &amp; Verified!</span>
                  <span className="text-[10px] font-mono bg-emerald-900/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700">
                    {completedModelAlert.model}
                  </span>
                </p>
                <p className="text-emerald-300/90 text-xs mt-0.5">
                  The model has finished downloading and is saved locally. You can start chatting with it immediately!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="activate-downloaded-model-btn"
                onClick={() => {
                  handleSelectModel(completedModelAlert.model);
                  setCompletedModelAlert(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Select &amp; Chat</span>
              </button>
              <button
                onClick={() => setCompletedModelAlert(null)}
                className="p-1 rounded-lg hover:bg-emerald-900/60 text-emerald-400 hover:text-emerald-200 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successNotice && (
        <div className="bg-emerald-950/80 border-b border-emerald-800/80 px-4 py-2 flex items-center justify-between text-xs text-emerald-200 animate-in fade-in">
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Notice */}
      {errorNotice && (
        <div className="bg-red-950/80 border-b border-red-800/80 px-4 py-2 flex items-center justify-between text-xs text-red-200 animate-in fade-in">
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorNotice}</span>
          </div>
          <button
            onClick={() => setErrorNotice(null)}
            className="text-red-400 hover:text-red-200 text-xs ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Chat Feed */}
      <ChatWindow
        messages={currentMessages}
        isLoading={isLoading}
        onSelectPrompt={handleSendMessage}
      />

      {/* Input */}
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />

      {/* Ollama Models Hub (Online Library + My Pulled & Local Models) */}
      <OllamaModelPicker
        isOpen={isModelPickerOpen}
        onClose={() => {
          setIsModelPickerOpen(false);
          fetchPulledModels();
        }}
        selectedModelId={selectedModel}
        onSelectModel={handleSelectModel}
        ollamaStatus={ollamaStatus}
        onOpenSettings={() => {
          setIsModelPickerOpen(false);
          setIsSettingsOpen(true);
        }}
        initialTab={modelPickerTab}
      />

      {/* Ollama Settings & Connection Modal */}
      <OllamaSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        status={ollamaStatus}
        onUpdateHost={handleUpdateHost}
        onRefreshStatus={fetchOllamaStatus}
      />

      {/* Persistent Memory Inspector Modal */}
      <MemoryInspector
        memory={memory}
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        onOpenImport={() => setIsImportOpen(true)}
      />

      {/* Import Chat History Modal */}
      <ImportChatModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}
