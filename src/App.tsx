import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';
import { MemoryInspector } from './components/MemoryInspector';
import { OllamaModelPicker } from './components/OllamaModelPicker';
import { OllamaSettingsModal } from './components/OllamaSettingsModal';
import { PythonAppsModal } from './components/PythonAppsModal';
import { MemoryState, OllamaStatus, PulledOllamaModel } from './types';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [memory, setMemory] = useState<MemoryState | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('abah_selected_model') || 'gemma2:2b';
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState<boolean>(false);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState<boolean>(false);
  const [modelPickerTab, setModelPickerTab] = useState<'online' | 'pulled'>('online');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isPythonAppsOpen, setIsPythonAppsOpen] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [pulledModels, setPulledModels] = useState<PulledOllamaModel[]>([]);

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

  // Fetch pulled models list
  const fetchPulledModels = useCallback(async () => {
    try {
      const res = await fetch('/api/ollama/pulled');
      if (res.ok) {
        const data = await res.json();
        setPulledModels(data.models || []);
      }
    } catch (err) {
      console.warn('Failed to load pulled models:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMemory();
    fetchOllamaStatus();
    fetchPulledModels();
  }, [fetchMemory, fetchOllamaStatus, fetchPulledModels]);

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('abah_selected_model', modelId);
    setSuccessNotice(`Switched active chatter model to "${modelId}"`);
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
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to update Ollama host');
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

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
              content: text,
              source: 'user',
              type: 'UserMessage',
              timestamp: optimisticTimestamp,
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
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorNotice(err.message || 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
        onOpenPythonApps={() => setIsPythonAppsOpen(true)}
        onClearMemory={handleClearMemory}
        onToggleMemoryView={() => setIsMemoryOpen((v) => !v)}
        isMemoryOpen={isMemoryOpen}
        isClearing={isClearing}
      />

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
      />

      {/* Ubuntu & Android Python Apps Modal */}
      <PythonAppsModal
        isOpen={isPythonAppsOpen}
        onClose={() => setIsPythonAppsOpen(false)}
      />
    </div>
  );
}
