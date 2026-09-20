import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Check,
  Download,
  Terminal,
  Sparkles,
  Layers,
  X,
  RefreshCw,
  Cpu,
  AlertTriangle,
  HardDrive,
  ExternalLink,
  Globe,
  Trash2,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Brain,
  Code,
  Eye,
  Zap,
} from 'lucide-react';
import {
  OnlineOllamaModel,
  PulledOllamaModel,
  OllamaStatus,
  OllamaFamily,
} from '../types';

interface OllamaModelPickerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  ollamaStatus: OllamaStatus | null;
  onOpenSettings: () => void;
  initialTab?: 'online' | 'pulled';
}

const CATEGORY_TABS: Array<{ id: string; label: string; icon?: React.ReactNode; family?: OllamaFamily; filter?: (m: OnlineOllamaModel) => boolean }> = [
  { id: 'all', label: 'All Online Models' },
  {
    id: 'popular',
    label: 'Popular & Trending',
    icon: <TrendingUp className="w-3.5 h-3.5 text-amber-400" />,
    filter: (m) => m.pulls.includes('M') || m.id.includes('llama3') || m.id.includes('deepseek') || m.id.includes('gemma2'),
  },
  {
    id: 'reasoning',
    label: 'Thinking & Reasoning',
    icon: <Brain className="w-3.5 h-3.5 text-purple-400" />,
    filter: (m) => m.capabilities.includes('thinking') || m.id.includes('deepseek-r1') || m.id.includes('qwq'),
  },
  {
    id: 'compact',
    label: 'Compact & Edge (<4B)',
    icon: <Zap className="w-3.5 h-3.5 text-emerald-400" />,
    filter: (m) =>
      m.parameters.some((p) => p.includes('0.5') || p.includes('1b') || p.includes('1.5b') || p.includes('2b') || p.includes('3b')) ||
      m.family === 'compact' ||
      m.id.includes('2b') ||
      m.id.includes('1b'),
  },
  {
    id: 'coding',
    label: 'Coding & Dev',
    icon: <Code className="w-3.5 h-3.5 text-blue-400" />,
    filter: (m) => m.id.includes('coder') || m.id.includes('code') || m.family === 'code',
  },
  {
    id: 'vision',
    label: 'Vision & Multimodal',
    icon: <Eye className="w-3.5 h-3.5 text-pink-400" />,
    filter: (m) => m.capabilities.includes('vision') || m.id.includes('llava') || m.id.includes('vision'),
  },
  { id: 'gemma', label: 'Gemma (Google)', family: 'gemma' },
  { id: 'llama', label: 'Llama (Meta)', family: 'llama' },
  { id: 'deepseek', label: 'DeepSeek', family: 'deepseek' },
  { id: 'qwen', label: 'Qwen', family: 'qwen' },
  { id: 'mistral', label: 'Mistral', family: 'mistral' },
  { id: 'phi', label: 'Phi-4', family: 'phi' },
];

export const QUICK_SIZE_OPTIONS = [
  { id: 'all', label: 'All Sizes' },
  { id: '0.5b', label: '0.5B' },
  { id: '1.5b', label: '1.5B' },
  { id: '2b', label: '2B' },
  { id: '3b', label: '3B' },
  { id: '7b', label: '7B' },
  { id: '8b', label: '8B' },
  { id: '12b', label: '12B' },
  { id: '14b', label: '14B' },
  { id: '32b', label: '32B' },
  { id: '70b', label: '70B+' },
];

export const OllamaModelPicker: React.FC<OllamaModelPickerProps> = ({
  isOpen,
  onClose,
  selectedModelId,
  onSelectModel,
  ollamaStatus,
  onOpenSettings,
  initialTab = 'online',
}) => {
  // Main view toggle: 'online' (Live Ollama Library) or 'pulled' (My Pulled & Local Models)
  const [mainView, setMainView] = useState<'online' | 'pulled'>(initialTab);
  const [onlineModels, setOnlineModels] = useState<OnlineOllamaModel[]>([]);
  const [pulledModels, setPulledModels] = useState<PulledOllamaModel[]>([]);
  const [isLoadingOnline, setIsLoadingOnline] = useState(false);
  const [isLoadingPulled, setIsLoadingPulled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [customModelInput, setCustomModelInput] = useState('');

  // Pulling state tracking
  const [pullingModels, setPullingModels] = useState<Record<string, { status: string; percent: number }>>({});
  const [notification, setNotification] = useState<{ text: string; isError?: boolean } | null>(null);

  // Selected tag per model card in online view (e.g. deepseek-r1 -> '8b')
  const [selectedTags, setSelectedTags] = useState<Record<string, string>>({});

  // Model size filter (Requirement: select model by size)
  const [sizeFilter, setSizeFilter] = useState<string>('all');

  // Confirmation modal when user selects an unpulled model (Requirement: confirm before pull)
  const [confirmPullModal, setConfirmPullModal] = useState<{
    baseModelId: string;
    tag: string;
    fullModelTag: string;
    name: string;
    description?: string;
  } | null>(null);

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setMainView(initialTab);
      loadOnlineModels();
      loadPulledModels();
    }
  }, [isOpen, initialTab]);

  // Load online models from /api/ollama/online
  const loadOnlineModels = async (query?: string) => {
    setIsLoadingOnline(true);
    try {
      const url = query ? `/api/ollama/online?q=${encodeURIComponent(query)}` : '/api/ollama/online';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setOnlineModels(data.models || []);
      }
    } catch (err) {
      console.error('Failed to load online models:', err);
    } finally {
      setIsLoadingOnline(false);
    }
  };

  // Load pulled models from /api/ollama/pulled
  const loadPulledModels = async () => {
    setIsLoadingPulled(true);
    try {
      const res = await fetch('/api/ollama/pulled');
      if (res.ok) {
        const data = await res.json();
        setPulledModels(data.models || []);
      }
    } catch (err) {
      console.error('Failed to load pulled models:', err);
    } finally {
      setIsLoadingPulled(false);
    }
  };

  // Debounced search for online models
  useEffect(() => {
    if (!isOpen || mainView !== 'online') return;
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 1) {
        loadOnlineModels(searchQuery);
      } else if (searchQuery.trim().length === 0) {
        loadOnlineModels();
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, mainView]);

  // Handle pull request for a model
  const handlePullModel = async (baseModelId: string, specificTag?: string) => {
    const chosenTag = specificTag || selectedTags[baseModelId] || 'latest';
    const fullModelTag = chosenTag !== 'latest' ? `${baseModelId}:${chosenTag}` : baseModelId;

    setPullingModels((prev) => ({
      ...prev,
      [fullModelTag]: { status: 'Initiating pull...', percent: 10 },
    }));

    try {
      const res = await fetch('/api/ollama/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: baseModelId, tag: chosenTag }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to trigger pull');
      }

      setNotification({
        text: `Downloading ${fullModelTag}... Model will be added to your pulled models.`,
      });

      // Poll pull status
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/ollama/pull/status?model=${encodeURIComponent(fullModelTag)}`);
          if (statusRes.ok) {
            const data = await statusRes.json();
            setPullingModels((prev) => ({
              ...prev,
              [fullModelTag]: {
                status: data.status || 'Downloading...',
                percent: data.percent || 50,
              },
            }));

            if (data.isDone) {
              clearInterval(pollInterval);
              setPullingModels((prev) => {
                const next = { ...prev };
                delete next[fullModelTag];
                return next;
              });
              setNotification({
                text: `Model ${fullModelTag} pulled successfully and ready to use!`,
              });
              loadPulledModels();
              loadOnlineModels();
            }
          }
        } catch {
          // ignore transient poll error
        }
      }, 1000);

      // Auto clear after 45s safety timeout
      setTimeout(() => clearInterval(pollInterval), 45000);
    } catch (err: any) {
      setPullingModels((prev) => {
        const next = { ...prev };
        delete next[fullModelTag];
        return next;
      });
      setNotification({
        text: err.message || 'Pull request failed',
        isError: true,
      });
    }
  };

  // Handle delete a pulled model
  const handleDeletePulled = async (modelId: string) => {
    if (!window.confirm(`Remove ${modelId} from your pulled models?`)) return;
    try {
      const res = await fetch(`/api/ollama/pulled/${encodeURIComponent(modelId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadPulledModels();
        loadOnlineModels();
        setNotification({ text: `Removed ${modelId}` });
      }
    } catch (err: any) {
      setNotification({ text: err.message || 'Failed to remove model', isError: true });
    }
  };

  // Filter online models by category tab and model size
  const filteredOnlineModels = useMemo(() => {
    return onlineModels.filter((model) => {
      const categoryConfig = CATEGORY_TABS.find((t) => t.id === activeCategory);
      if (categoryConfig) {
        if (categoryConfig.family && model.family !== categoryConfig.family) {
          return false;
        }
        if (categoryConfig.filter && !categoryConfig.filter(model)) {
          return false;
        }
      }

      if (sizeFilter !== 'all') {
        const hasSize = model.parameters.some((p) =>
          p.toLowerCase().startsWith(sizeFilter.toLowerCase()) ||
          p.toLowerCase().includes(sizeFilter.toLowerCase())
        );
        if (!hasSize) return false;
      }

      return true;
    });
  }, [onlineModels, activeCategory, sizeFilter]);

  // Filter pulled models by search query
  const filteredPulledModels = useMemo(() => {
    if (!searchQuery.trim()) return pulledModels;
    const q = searchQuery.toLowerCase().trim();
    return pulledModels.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
    );
  }, [pulledModels, searchQuery]);

  const handleSelectCustom = () => {
    const trimmed = customModelInput.trim();
    if (!trimmed) return;
    onSelectModel(trimmed);
    setCustomModelInput('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="ollama-model-picker-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        id="ollama-model-picker-dialog"
        className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/10"
      >
        {/* Header with Title and Main View Switcher */}
        <div className="px-5 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4 bg-zinc-900/95">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-inner">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
                  Ollama Models Hub
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {mainView === 'online' ? `${onlineModels.length} Online Models` : `${pulledModels.length} Pulled`}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {mainView === 'online'
                  ? 'Real-time online catalog from Ollama library — pick any model to pull & chat'
                  : 'Models currently pulled and available locally for chatter companion'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Main View Mode Selector */}
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
              <button
                id="tab-online-models-btn"
                onClick={() => {
                  setMainView('online');
                  setSearchQuery('');
                }}
                className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                  mainView === 'online'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Online Library</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-900/60 text-indigo-200">
                  {onlineModels.length}
                </span>
              </button>
              <button
                id="tab-pulled-models-btn"
                onClick={() => {
                  setMainView('pulled');
                  setSearchQuery('');
                }}
                className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                  mainView === 'pulled'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                <span>My Pulled & Local</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                  {pulledModels.length}
                </span>
              </button>
            </div>

            {/* Refresh */}
            <button
              id="refresh-models-btn"
              onClick={() => {
                loadOnlineModels();
                loadPulledModels();
              }}
              disabled={isLoadingOnline || isLoadingPulled}
              title="Refresh models"
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingOnline || isLoadingPulled ? 'animate-spin' : ''}`} />
            </button>

            {/* Close */}
            <button
              id="close-model-picker-btn"
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status & Notification Banner */}
        <div className="px-5 py-2 bg-zinc-950/70 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                ollamaStatus?.connected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80' : 'bg-amber-400'
              }`}
            />
            <span className="text-zinc-300 font-medium">
              Ollama Host: <code className="text-zinc-400 font-mono text-[11px]">{ollamaStatus?.host || 'http://localhost:11434'}</code>
            </span>
            {ollamaStatus?.connected ? (
              <span className="text-emerald-400 text-[11px] font-medium bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/60">
                Connected {ollamaStatus.version ? `(v${ollamaStatus.version})` : ''}
              </span>
            ) : (
              <span className="text-amber-400 text-[11px] font-medium bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/60">
                Offline / Remote Mode
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenSettings}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
            >
              Configure Host Settings &rarr;
            </button>
          </div>
        </div>

        {/* Global Toast / Feedback */}
        {notification && (
          <div
            className={`px-5 py-2 text-xs flex items-center justify-between border-b ${
              notification.isError
                ? 'bg-red-950/60 text-red-200 border-red-800/60'
                : 'bg-emerald-950/60 text-emerald-200 border-emerald-800/60'
            }`}
          >
            <span>{notification.text}</span>
            <button onClick={() => setNotification(null)} className="text-zinc-400 hover:text-zinc-200 text-xs ml-3">
              &times;
            </button>
          </div>
        )}

        {/* Search & Category Filter Section */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/60 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="search-models-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                mainView === 'online'
                  ? 'Search live online Ollama library (e.g. llama3.2, deepseek-r1, gemma2, qwen2.5, phi4, 7b)...'
                  : 'Search your pulled & local models...'
              }
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sub-categories (Only for Online view) */}
          {mainView === 'online' && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin">
                {CATEGORY_TABS.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors text-xs flex items-center gap-1.5 ${
                      activeCategory === cat.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    {cat.icon}
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Quick Model Size Filter (Requirement: select model by size) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin pt-1 border-t border-zinc-800/60">
                <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-amber-400" />
                  <span>Size Filter:</span>
                </span>
                {QUICK_SIZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSizeFilter(opt.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono whitespace-nowrap transition-colors ${
                      sizeFilter === opt.id
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-sm'
                        : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:text-zinc-200 hover:bg-zinc-850'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[340px]">
          {/* Active Model Download Loading Bars (Requirement: loading bar to see how the model is being downloaded) */}
          {Object.keys(pullingModels).length > 0 && (
            <div className="bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-950 border border-amber-500/40 rounded-xl p-3.5 space-y-2.5 shadow-lg">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-amber-300 font-semibold">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Active Download in Progress</span>
                </div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
                  Streaming from Ollama Library
                </span>
              </div>
              {Object.entries(pullingModels).map(([modelTag, state]) => (
                <div key={modelTag} className="bg-black/50 border border-zinc-800/80 rounded-lg p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-100">{modelTag}</span>
                      <span className="text-[11px] text-zinc-400">{state.status}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-400">{state.percent}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-amber-300 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(state.percent, 3)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* VIEW 1: ONLINE MODELS (The requested online-first view of all models available online) */}
          {mainView === 'online' && (
            <>
              {isLoadingOnline && onlineModels.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                  <p className="text-sm font-medium text-zinc-300">Fetching current online models from Ollama...</p>
                  <p className="text-xs text-zinc-500">Querying real-time Ollama library directory</p>
                </div>
              ) : filteredOnlineModels.length === 0 ? (
                <div className="text-center py-16">
                  <Globe className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-zinc-300">No online models matched your search</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                    Try searching for common names like &quot;gemma&quot;, &quot;llama&quot;, &quot;deepseek&quot;, or enter a custom tag below.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredOnlineModels.map((model) => {
                    const currentTag = selectedTags[model.id] || (model.parameters[0] || 'latest');
                    const fullModelTag = currentTag !== 'latest' ? `${model.id}:${currentTag}` : model.id;
                    const isSelected = selectedModelId.toLowerCase() === fullModelTag.toLowerCase() ||
                                       selectedModelId.toLowerCase() === model.id.toLowerCase();

                    // Check if already pulled
                    const isPulled =
                      pulledModels.some(
                        (p) =>
                          p.id.toLowerCase() === fullModelTag.toLowerCase() ||
                          p.id.toLowerCase() === model.id.toLowerCase() ||
                          p.baseModelId?.toLowerCase() === model.id.toLowerCase()
                      ) || model.isPulled;

                    const pullState = pullingModels[fullModelTag] || pullingModels[model.id];

                    return (
                      <div
                        key={model.id}
                        className={`rounded-xl p-4 border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-950/40 border-indigo-500/80 ring-1 ring-indigo-500/40'
                            : 'bg-zinc-950/60 hover:bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
                        }`}
                      >
                        <div>
                          {/* Card Header: Model Slug & Badges */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-zinc-100 bg-zinc-800/90 px-2 py-0.5 rounded border border-zinc-700">
                                {model.id}
                              </span>
                              <span className="text-[10px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                                {model.pulls} pulls
                              </span>
                            </div>

                            {/* Status Pill */}
                            {isPulled ? (
                              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-800/70 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                Pulled & Local
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-amber-400/90 bg-amber-950/30 border border-amber-800/50 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                <Globe className="w-3 h-3" />
                                Available Online
                              </span>
                            )}
                          </div>

                          {/* Model Title & Description */}
                          <h3 className="text-xs font-semibold text-zinc-200 mb-1">{model.name}</h3>
                          <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2 mb-3">
                            {model.description}
                          </p>

                          {/* Parameter options & capabilities */}
                          <div className="space-y-2 mb-3">
                            {/* Parameters options */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] text-zinc-500 uppercase font-semibold mr-1">
                                Sizes:
                              </span>
                              {model.parameters.map((param) => {
                                const isTagActive = (selectedTags[model.id] || model.parameters[0]) === param;
                                return (
                                  <button
                                    key={param}
                                    onClick={() =>
                                      setSelectedTags((prev) => ({ ...prev, [model.id]: param }))
                                    }
                                    className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                                      isTagActive
                                        ? 'bg-indigo-600 text-white border-indigo-500'
                                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                                    }`}
                                  >
                                    {param}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Capability Tags */}
                            {model.capabilities.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1">
                                {model.capabilities.map((cap) => (
                                  <span
                                    key={cap}
                                    className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.2 rounded bg-zinc-900/80 text-zinc-400 border border-zinc-800"
                                  >
                                    {cap}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Pulling Progress or Action Controls */}
                        <div className="pt-2.5 border-t border-zinc-800/70">
                          {pullState ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] text-amber-300">
                                <span className="flex items-center gap-1.5">
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  {pullState.status}
                                </span>
                                <span className="font-mono font-semibold">{pullState.percent}%</span>
                              </div>
                              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-amber-400 h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${pullState.percent}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {/* If already pulled, can select directly as chatter */}
                              {isPulled ? (
                                <button
                                  id={`select-online-${model.id}-btn`}
                                  onClick={() => {
                                    onSelectModel(fullModelTag);
                                    onClose();
                                  }}
                                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white shadow-sm'
                                      : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200'
                                  }`}
                                >
                                  {isSelected ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Active Chatter Model</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>Select & Chat</span>
                                      <ArrowRight className="w-3 h-3 text-zinc-400" />
                                    </>
                                  )}
                                </button>
                              ) : (
                                <button
                                  id={`pull-online-${model.id}-btn`}
                                  onClick={() =>
                                    setConfirmPullModal({
                                      baseModelId: model.id,
                                      tag: currentTag,
                                      fullModelTag,
                                      name: model.name,
                                      description: model.description,
                                    })
                                  }
                                  className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                                  title={`Select or pull ${fullModelTag} from online library`}
                                >
                                  <Download className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Select &amp; Pull ({currentTag})</span>
                                </button>
                              )}

                              {/* Direct pull button if already pulled to re-pull/update */}
                              {isPulled && (
                                <button
                                  onClick={() => handlePullModel(model.id, currentTag)}
                                  title={`Re-pull or update ${fullModelTag}`}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 transition-colors"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* VIEW 2: MY PULLED & LOCAL MODELS (List of models previously pulled or available locally) */}
          {mainView === 'pulled' && (
            <>
              {filteredPulledModels.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <HardDrive className="w-12 h-12 text-zinc-600 mx-auto" />
                  <h3 className="text-sm font-semibold text-zinc-200">No Pulled Models Found</h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    You haven&apos;t pulled any models yet. Switch to the Online Library tab to browse and download your first model with one click.
                  </p>
                  <button
                    onClick={() => setMainView('online')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-lg shadow-indigo-600/20"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Browse Online Library &rarr;</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-xs text-zinc-400 flex items-center justify-between pb-1">
                    <span>
                      Showing {filteredPulledModels.length} models ready for inference
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      Persistent across sessions
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredPulledModels.map((model) => {
                      const isSelected = selectedModelId.toLowerCase() === model.id.toLowerCase();
                      const dateStr = model.pulledAt ? new Date(model.pulledAt).toLocaleDateString() : 'Installed';

                      return (
                        <div
                          key={model.id}
                          className={`rounded-xl p-4 border transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'bg-indigo-950/40 border-indigo-500/80 ring-1 ring-indigo-500/40'
                              : 'bg-zinc-950/70 hover:bg-zinc-900/60 border-zinc-800'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-mono font-bold text-zinc-100 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                                  {model.id}
                                </span>
                                {model.parameterSize && (
                                  <span className="text-[10px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                                    {model.parameterSize}
                                  </span>
                                )}
                                {model.size && (
                                  <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                                    {model.size}
                                  </span>
                                )}
                              </div>

                              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-800/70 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Ready
                              </span>
                            </div>

                            <h4 className="text-xs font-semibold text-zinc-200 mb-1">{model.name}</h4>
                            <p className="text-[11px] text-zinc-400 line-clamp-2 mb-2">
                              {model.description || `Local Ollama model profile for companion chatter.`}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              Pulled: {dateStr}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 pt-3 border-t border-zinc-800/70 mt-2">
                            <button
                              id={`select-pulled-${model.id}-btn`}
                              onClick={() => {
                                onSelectModel(model.id);
                                onClose();
                              }}
                              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Active Chatter Model</span>
                                </>
                              ) : (
                                <span>Select as Chatter</span>
                              )}
                            </button>

                            <button
                              id={`delete-pulled-${model.id}-btn`}
                              onClick={() => handleDeletePulled(model.id)}
                              title={`Remove ${model.id} from pulled list`}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer: Custom Tag Input & Quick Links */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <Terminal className="w-4 h-4 text-zinc-500 shrink-0" />
            <span className="text-xs text-zinc-400 shrink-0 hidden md:inline">
              Custom Ollama Tag:
            </span>
            <input
              id="custom-model-tag-input"
              type="text"
              value={customModelInput}
              onChange={(e) => setCustomModelInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSelectCustom()}
              placeholder="e.g. gemma4:12b, vicuna:13b, or user/my-custom-model"
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              id="use-custom-tag-btn"
              onClick={handleSelectCustom}
              disabled={!customModelInput.trim()}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors disabled:opacity-40"
            >
              Use Tag
            </button>
          </div>

          <div className="text-[11px] text-zinc-500 flex items-center gap-3 w-full sm:w-auto justify-end">
            <span className="flex items-center gap-1 text-zinc-400">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              Live Ollama Registry
            </span>
            <a
              href="https://ollama.com/library"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>ollama.com/library</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Confirmation Modal when user selects a model that is not available locally */}
      {confirmPullModal && (
        <div
          id="confirm-pull-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl ring-1 ring-white/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-zinc-100">
                  Model Not Available Locally
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Download required to use this model
                </p>
              </div>
              <button
                onClick={() => setConfirmPullModal(null)}
                className="text-zinc-400 hover:text-zinc-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Selected Model:</span>
                <span className="font-semibold text-zinc-200">{confirmPullModal.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Model Tag &amp; Size:</span>
                <span className="font-mono text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                  {confirmPullModal.fullModelTag}
                </span>
              </div>
              {confirmPullModal.description && (
                <p className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-800 leading-relaxed">
                  {confirmPullModal.description}
                </p>
              )}
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              This model is currently not installed on your local Ollama server. Would you like to pull and download it now? You will see a real-time progress bar tracking the download.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                onClick={() => setConfirmPullModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-750 transition-colors"
              >
                Cancel
              </button>
              <button
                id="confirm-pull-action-btn"
                onClick={() => {
                  const { baseModelId, tag } = confirmPullModal;
                  setConfirmPullModal(null);
                  handlePullModel(baseModelId, tag);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-zinc-950 bg-amber-500 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
              >
                <Download className="w-4 h-4" />
                <span>Yes, Pull Model</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
