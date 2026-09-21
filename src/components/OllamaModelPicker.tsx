import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  SlidersHorizontal,
  ChevronDown,
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

const CATEGORY_TABS: Array<{
  id: string;
  label: string;
  icon?: React.ReactNode;
  family?: OllamaFamily;
  filter?: (m: OnlineOllamaModel) => boolean;
}> = [
  { id: 'all', label: 'All Models' },
  {
    id: 'popular',
    label: 'Popular & Trending',
    icon: <TrendingUp className="w-3.5 h-3.5 text-amber-400" />,
    filter: (m) =>
      m.pulls.includes('M') ||
      m.id.includes('llama3') ||
      m.id.includes('deepseek') ||
      m.id.includes('gemma2') ||
      m.id.includes('qwen2.5'),
  },
  {
    id: 'reasoning',
    label: 'Thinking & Reasoning',
    icon: <Brain className="w-3.5 h-3.5 text-purple-400" />,
    filter: (m) =>
      m.capabilities.includes('thinking') ||
      m.id.includes('deepseek-r1') ||
      m.id.includes('qwq') ||
      m.id.includes('r1'),
  },
  {
    id: 'compact',
    label: 'Compact & Edge (<4B)',
    icon: <Zap className="w-3.5 h-3.5 text-emerald-400" />,
    filter: (m) =>
      m.parameters.some(
        (p) =>
          p.includes('0.5') ||
          p.includes('1b') ||
          p.includes('1.5b') ||
          p.includes('2b') ||
          p.includes('3b')
      ) ||
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
    filter: (m) =>
      m.capabilities.includes('vision') ||
      m.id.includes('llava') ||
      m.id.includes('vision'),
  },
  { id: 'qwen', label: 'Qwen 2.5', family: 'qwen' },
  { id: 'deepseek', label: 'DeepSeek', family: 'deepseek' },
  { id: 'gemma', label: 'Gemma 2', family: 'gemma' },
  { id: 'llama', label: 'Llama 3', family: 'llama' },
  { id: 'mistral', label: 'Mistral', family: 'mistral' },
  { id: 'phi', label: 'Phi-4', family: 'phi' },
];

const SIZE_FILTERS: Array<{ id: string; label: string; test?: (param: string) => boolean }> = [
  { id: 'all', label: 'All Sizes' },
  {
    id: 'tiny',
    label: '< 3B (Edge/Mobile)',
    test: (p) => {
      const num = parseFloat(p);
      return !isNaN(num) && num < 3;
    },
  },
  {
    id: 'standard',
    label: '7B - 9B (Standard)',
    test: (p) => {
      const num = parseFloat(p);
      return !isNaN(num) && num >= 7 && num <= 9;
    },
  },
  {
    id: 'medium',
    label: '12B - 14B (Advanced)',
    test: (p) => {
      const num = parseFloat(p);
      return !isNaN(num) && num >= 12 && num <= 14;
    },
  },
  {
    id: 'heavy',
    label: '32B+ (Frontier)',
    test: (p) => {
      const num = parseFloat(p);
      return !isNaN(num) && num >= 32;
    },
  },
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
  const [mainView, setMainView] = useState<'online' | 'pulled'>(initialTab);
  const [onlineModels, setOnlineModels] = useState<OnlineOllamaModel[]>([]);
  const [pulledModels, setPulledModels] = useState<PulledOllamaModel[]>([]);
  const [isLoadingOnline, setIsLoadingOnline] = useState(false);
  const [isLoadingPulled, setIsLoadingPulled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeSizeFilter, setActiveSizeFilter] = useState('all');
  const [customModelInput, setCustomModelInput] = useState('');

  // Selected tag per model card (e.g. 'qwen2.5' -> '8b', '14b', etc.)
  const [selectedTags, setSelectedTags] = useState<Record<string, string>>({});

  // Real-time pulling state tracking: modelTag -> { status, percent, completed, total, isDone }
  const [pullingModels, setPullingModels] = useState<
    Record<
      string,
      { status: string; percent: number; completed?: number; total?: number; isDone?: boolean }
    >
  >({});
  const [notification, setNotification] = useState<{ text: string; isError?: boolean } | null>(
    null
  );

  // Confirmation Modal: When selecting an unpulled model
  const [unpulledPrompt, setUnpulledPrompt] = useState<{
    baseModelId: string;
    modelName: string;
    tag: string;
    fullTag: string;
  } | null>(null);

  // Confirmation Modal: For deleting a pulled model
  const [deleteConfirmModel, setDeleteConfirmModel] = useState<string | null>(null);

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setMainView(initialTab);
      loadOnlineModels();
      loadPulledModels();
    }
  }, [isOpen, initialTab]);

  // Load online models
  const loadOnlineModels = useCallback(async (query?: string) => {
    setIsLoadingOnline(true);
    try {
      const url = query
        ? `/api/ollama/online?q=${encodeURIComponent(query)}`
        : '/api/ollama/online';
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
  }, []);

  // Load pulled models
  const loadPulledModels = useCallback(async () => {
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
  }, []);

  // Check if a model tag is available locally in pulled models
  const isModelAvailableLocally = useCallback(
    (fullTag: string): boolean => {
      const lowerTarget = fullTag.toLowerCase().trim();
      const baseName = lowerTarget.split(':')[0];
      const tagName = lowerTarget.includes(':') ? lowerTarget.split(':')[1] : 'latest';

      return pulledModels.some((p) => {
        const pLower = p.id.toLowerCase().trim();
        if (pLower === lowerTarget) return true;
        if (tagName === 'latest' && pLower === baseName) return true;
        if (tagName === 'latest' && pLower === `${baseName}:latest`) return true;
        if (pLower === `${baseName}:${tagName}`) return true;
        return false;
      });
    },
    [pulledModels]
  );

  // Trigger Model Pull with Live Loading Bar
  const handlePullModel = async (baseModelId: string, specificTag?: string) => {
    const chosenTag = specificTag || selectedTags[baseModelId] || 'latest';
    const fullModelTag = chosenTag !== 'latest' ? `${baseModelId}:${chosenTag}` : baseModelId;

    // Immediately register in pulling state
    setPullingModels((prev) => ({
      ...prev,
      [fullModelTag]: { status: 'Initiating download...', percent: 12 },
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
        text: `Downloading ${fullModelTag}... Check the loading bar below for live download progress.`,
      });

      // Poll pull status
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `/api/ollama/pull/status?model=${encodeURIComponent(fullModelTag)}`
          );
          if (statusRes.ok) {
            const data = await statusRes.json();
            setPullingModels((prev) => ({
              ...prev,
              [fullModelTag]: {
                status: data.status || 'Downloading layers...',
                percent: data.percent ?? 50,
                completed: data.completed,
                total: data.total,
              },
            }));

            if (data.isDone) {
              clearInterval(pollInterval);
              setPullingModels((prev) => ({
                ...prev,
                [fullModelTag]: {
                  status: 'Pull completed & verified!',
                  percent: 100,
                  completed: data.completed,
                  total: data.total,
                  isDone: true,
                },
              }));
              setNotification({
                text: `Model ${fullModelTag} downloaded successfully and ready for chatter!`,
              });
              loadPulledModels();
              loadOnlineModels();

              // Clear in-flight indicator after delay so user sees 100% completion
              setTimeout(() => {
                setPullingModels((prev) => {
                  const next = { ...prev };
                  delete next[fullModelTag];
                  return next;
                });
              }, 4000);
            }
          }
        } catch {
          // ignore transient poll error
        }
      }, 1000);

      // Auto clear after 60s
      setTimeout(() => clearInterval(pollInterval), 60000);
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

  // When user attempts to select a model
  const handleAttemptSelect = (baseModelId: string, modelName: string, chosenTag?: string) => {
    const tag = chosenTag || selectedTags[baseModelId] || 'latest';
    const fullTag = tag !== 'latest' ? `${baseModelId}:${tag}` : baseModelId;

    if (isModelAvailableLocally(fullTag)) {
      // Available locally, select immediately!
      onSelectModel(fullTag);
      onClose();
    } else {
      // Inform the user and show download modal with live loading bar
      setUnpulledPrompt({
        baseModelId,
        modelName,
        tag,
        fullTag,
      });
    }
  };

  // Confirm pull from unpulled prompt (keeps dialog open so user can observe loading bar)
  const handleConfirmPullFromPrompt = () => {
    if (!unpulledPrompt) return;
    const { baseModelId, tag } = unpulledPrompt;
    handlePullModel(baseModelId, tag);
  };

  // Confirm and delete pulled model
  const handleExecuteDeletePulled = async () => {
    if (!deleteConfirmModel) return;
    const targetModel = deleteConfirmModel;
    setDeleteConfirmModel(null);

    try {
      const res = await fetch(`/api/ollama/pulled/${encodeURIComponent(targetModel)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setNotification({ text: `Successfully deleted model "${targetModel}"` });
        loadPulledModels();
        loadOnlineModels();

        // If the active model was deleted, switch to fallback
        if (selectedModelId.toLowerCase() === targetModel.toLowerCase()) {
          onSelectModel('gemma2:2b');
          setNotification({
            text: `Deleted active model "${targetModel}". Switched active chatter to gemma2:2b.`,
          });
        }
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete model');
      }
    } catch (err: any) {
      setNotification({
        text: err.message || 'Failed to remove model',
        isError: true,
      });
    }
  };

  // Filter online models by category and size filter
  const filteredOnlineModels = useMemo(() => {
    return onlineModels.filter((model) => {
      // Category filter
      const categoryConfig = CATEGORY_TABS.find((t) => t.id === activeCategory);
      if (categoryConfig) {
        if (categoryConfig.family && model.family !== categoryConfig.family) {
          return false;
        }
        if (categoryConfig.filter && !categoryConfig.filter(model)) {
          return false;
        }
      }

      // Size filter
      const sizeConfig = SIZE_FILTERS.find((s) => s.id === activeSizeFilter);
      if (sizeConfig && sizeConfig.test) {
        const hasMatchingSize = model.parameters.some((p) => sizeConfig.test!(p));
        if (!hasMatchingSize) return false;
      }

      return true;
    });
  }, [onlineModels, activeCategory, activeSizeFilter]);

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
    if (isModelAvailableLocally(trimmed)) {
      onSelectModel(trimmed);
      setCustomModelInput('');
      onClose();
    } else {
      const base = trimmed.split(':')[0];
      const tag = trimmed.includes(':') ? trimmed.split(':')[1] : 'latest';
      setUnpulledPrompt({
        baseModelId: base,
        modelName: trimmed,
        tag,
        fullTag: trimmed,
      });
      setCustomModelInput('');
    }
  };

  // Check if any downloads are active
  const activeDownloadsList = Object.entries(pullingModels);

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
                  {mainView === 'online'
                    ? `${onlineModels.length} Models`
                    : `${pulledModels.length} Pulled`}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {mainView === 'online'
                  ? 'Browse models, select by parameter size (e.g. 8b, 12b), and pull with real-time download bar'
                  : 'Models currently downloaded on your machine. Delete or switch models anytime'}
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
                <span>My Pulled &amp; Local</span>
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
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoadingOnline || isLoadingPulled ? 'animate-spin' : ''}`}
              />
            </button>

            {/* Close */}
            <button
              id="close-model-picker-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Real-time Global Download / Loading Bar Banner */}
        {activeDownloadsList.length > 0 && (
          <div className="bg-amber-950/40 border-b border-amber-800/50 p-3 space-y-2">
            {activeDownloadsList.map(([modelTag, progress]) => (
              <div key={modelTag} className="max-w-4xl mx-auto space-y-1.5">
                <div className="flex items-center justify-between text-xs text-amber-200">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                    <span className="font-semibold text-amber-300">
                      Downloading {modelTag}
                    </span>
                    <span className="text-zinc-400 text-[11px]">&middot; {progress.status}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono font-bold text-amber-300">
                    {progress.completed && progress.total && (
                      <span className="text-[11px] text-zinc-400 font-normal">
                        {Math.round(progress.completed / 1024 / 1024)} MB /{' '}
                        {Math.round(progress.total / 1024 / 1024)} MB
                      </span>
                    )}
                    <span>{progress.percent}%</span>
                  </div>
                </div>
                {/* Live Animated Loading Bar */}
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden shadow-inner">
                  <div
                    className="bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(8, progress.percent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notifications */}
        {notification && (
          <div
            className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
              notification.isError
                ? 'bg-red-950/80 border-red-800 text-red-200'
                : 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.isError ? (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{notification.text}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs hover:opacity-80 ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Search and Filters Bar */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/60 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-models-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  mainView === 'online'
                    ? 'Search by name or size: e.g. "qwen2.5 8b", "llama 3.2", "deepseek r1"...'
                    : 'Filter your pulled models...'
                }
                className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Size Filter Selector (For Online View) */}
            {mainView === 'online' && (
              <div className="flex items-center gap-1.5 bg-zinc-900 px-2 py-1 rounded-xl border border-zinc-800 text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-1" />
                <span className="text-zinc-400 text-[11px] hidden md:inline">Size:</span>
                <div className="flex gap-1 overflow-x-auto">
                  {SIZE_FILTERS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSizeFilter(s.id)}
                      className={`px-2 py-1 rounded-lg text-[11px] whitespace-nowrap transition-colors ${
                        activeSizeFilter === s.id
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Category Tabs (Online View) */}
          {mainView === 'online' && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 whitespace-nowrap transition-all ${
                    activeCategory === tab.id
                      ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 font-medium'
                      : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* VIEW 1: ONLINE LIBRARY */}
          {mainView === 'online' && (
            <>
              {isLoadingOnline ? (
                <div className="text-center py-16 space-y-3">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                  <p className="text-xs text-zinc-400">Loading Ollama models library...</p>
                </div>
              ) : filteredOnlineModels.length === 0 ? (
                <div className="text-center py-16 space-y-2">
                  <Globe className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-zinc-300">
                    No models matched your search or size filter
                  </p>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Try clearing the size filter or searching for &quot;qwen&quot;, &quot;llama&quot;,
                    or &quot;deepseek&quot;.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredOnlineModels.map((model) => {
                    const currentTag =
                      selectedTags[model.id] || model.parameters[0] || 'latest';
                    const fullModelTag =
                      currentTag !== 'latest' ? `${model.id}:${currentTag}` : model.id;

                    const isSelected =
                      selectedModelId.toLowerCase() === fullModelTag.toLowerCase();
                    const isLocallyPulled = isModelAvailableLocally(fullModelTag);
                    const pullState =
                      pullingModels[fullModelTag] || pullingModels[model.id];

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
                          {/* Card Header: Model Slug & Status */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-zinc-100 bg-zinc-800/90 px-2 py-0.5 rounded border border-zinc-700">
                                {model.id}
                              </span>
                              {model.pulls && (
                                <span className="text-[10px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                                  {model.pulls} pulls
                                </span>
                              )}
                            </div>

                            {/* Status Pill for Selected Tag */}
                            {isLocallyPulled ? (
                              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-800/70 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                Available Locally
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-amber-400/90 bg-amber-950/30 border border-amber-800/50 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                <Globe className="w-3 h-3" />
                                Needs Pulling
                              </span>
                            )}
                          </div>

                          {/* Model Title & Description */}
                          <h3 className="text-xs font-semibold text-zinc-200 mb-1">
                            {model.name}
                          </h3>
                          <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2 mb-3">
                            {model.description}
                          </p>

                          {/* SELECT BY SIZE: Parameter Size Pills */}
                          <div className="space-y-2 mb-3 bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/60">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-zinc-400 uppercase font-semibold">
                                Select Parameter Size:
                              </span>
                              <span className="font-mono text-[11px] text-indigo-300 font-semibold">
                                {model.id}:{currentTag}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {model.parameters.map((param) => {
                                const isTagActive = currentTag === param;
                                const paramFullTag = `${model.id}:${param}`;
                                const isParamPulled = isModelAvailableLocally(paramFullTag);

                                return (
                                  <button
                                    key={param}
                                    onClick={() =>
                                      setSelectedTags((prev) => ({
                                        ...prev,
                                        [model.id]: param,
                                      }))
                                    }
                                    className={`text-[10px] font-mono px-2 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                                      isTagActive
                                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm font-bold ring-1 ring-white/20'
                                        : isParamPulled
                                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:border-emerald-600'
                                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                                    }`}
                                    title={
                                      isParamPulled
                                        ? `${model.id}:${param} (Installed locally)`
                                        : `${model.id}:${param} (Online)`
                                    }
                                  >
                                    <span>{param}</span>
                                    {isParamPulled && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Capabilities */}
                            {model.capabilities.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 pt-1">
                                {model.capabilities.map((cap) => (
                                  <span
                                    key={cap}
                                    className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-800"
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
                            /* Live Loading Bar */
                            <div className="space-y-1.5 bg-zinc-950 p-2 rounded-xl border border-amber-800/40">
                              <div className="flex items-center justify-between text-[11px] text-amber-300">
                                <span className="flex items-center gap-1.5 truncate">
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0 text-amber-400" />
                                  <span className="truncate">{pullState.status}</span>
                                </span>
                                <span className="font-mono font-bold text-amber-400 ml-2 shrink-0">
                                  {pullState.percent}%
                                </span>
                              </div>
                              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-amber-500 to-emerald-400 h-2 rounded-full transition-all duration-300 ease-out"
                                  style={{ width: `${Math.max(5, pullState.percent)}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {/* Primary Select Button: Informs if unpulled, or activates if pulled */}
                              <button
                                id={`select-btn-${model.id}-${currentTag}`}
                                onClick={() =>
                                  handleAttemptSelect(model.id, model.name, currentTag)
                                }
                                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                    : isLocallyPulled
                                    ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-100 border border-zinc-700'
                                    : 'bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-200 border border-indigo-800/60'
                                }`}
                              >
                                {isSelected ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Active Chatter Model</span>
                                  </>
                                ) : isLocallyPulled ? (
                                  <>
                                    <span>Select &amp; Chat ({currentTag})</span>
                                    <ArrowRight className="w-3 h-3 text-zinc-400" />
                                  </>
                                ) : (
                                  <>
                                    <span>Select {currentTag}</span>
                                    <span className="text-[10px] text-amber-300 font-normal">
                                      (Will Prompt to Pull)
                                    </span>
                                  </>
                                )}
                              </button>

                              {/* Direct Pull Button */}
                              {!isLocallyPulled ? (
                                <button
                                  id={`pull-btn-${model.id}-${currentTag}`}
                                  onClick={() => handlePullModel(model.id, currentTag)}
                                  className="py-1.5 px-3 rounded-lg text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition-colors shrink-0"
                                  title={`Download and pull ${model.id}:${currentTag}`}
                                >
                                  <Download className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Pull</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handlePullModel(model.id, currentTag)}
                                  title={`Re-pull or update ${model.id}:${currentTag}`}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 transition-colors"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
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

          {/* VIEW 2: MY PULLED & LOCAL MODELS */}
          {mainView === 'pulled' && (
            <>
              {filteredPulledModels.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <HardDrive className="w-12 h-12 text-zinc-600 mx-auto" />
                  <h3 className="text-sm font-semibold text-zinc-200">No Pulled Models Found</h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    You don&apos;t have any models downloaded yet. Switch to the Online Library tab to
                    browse models by name or size and download them with one click.
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
                <div className="space-y-3">
                  <div className="text-xs text-zinc-400 flex items-center justify-between pb-1">
                    <span>
                      Showing {filteredPulledModels.length} models ready for chatter &amp; inference
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      Persistent across sessions
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredPulledModels.map((model) => {
                      const isSelected =
                        selectedModelId.toLowerCase() === model.id.toLowerCase();
                      const dateStr = model.pulledAt
                        ? new Date(model.pulledAt).toLocaleDateString()
                        : 'Installed';

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

                            <h4 className="text-xs font-semibold text-zinc-200 mb-1">
                              {model.name}
                            </h4>
                            <p className="text-[11px] text-zinc-400 line-clamp-2 mb-2">
                              {model.description || `Local Ollama model profile for companion chatter.`}
                            </p>
                            <p className="text-[10px] text-zinc-500">Pulled: {dateStr}</p>
                          </div>

                          <div className="flex items-center gap-2 pt-3 border-t border-zinc-800/70 mt-3">
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

                            {/* Delete Button with In-App Confirmation */}
                            <button
                              id={`delete-pulled-${model.id}-btn`}
                              onClick={() => setDeleteConfirmModel(model.id)}
                              title={`Delete ${model.id} from local repository`}
                              className="px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-800/50 transition-colors flex items-center gap-1 text-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Delete</span>
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
              Custom Tag:
            </span>
            <input
              id="custom-model-tag-input"
              type="text"
              value={customModelInput}
              onChange={(e) => setCustomModelInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSelectCustom()}
              placeholder="e.g. qwen2.5:8b, llama3.2:1b, or user/my-custom-model"
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

      {/* CONFIRMATION & LIVE PULL PROGRESS DIALOG: Does not change until user leaves or process finishes */}
      {unpulledPrompt && (() => {
        const activePromptPull =
          pullingModels[unpulledPrompt.fullTag] ||
          pullingModels[unpulledPrompt.baseModelId] ||
          (isModelAvailableLocally(unpulledPrompt.fullTag)
            ? { status: 'Model ready & available locally', percent: 100, isDone: true }
            : null);
        const isPullDone = Boolean(activePromptPull && (activePromptPull.isDone || activePromptPull.percent === 100));
        const isPullingActive = Boolean(activePromptPull && !isPullDone);

        return (
          <div
            id="unpulled-model-dialog"
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in"
          >
            <div
              className={`bg-zinc-900 border rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 ring-1 transition-all ${
                isPullDone
                  ? 'border-emerald-500/50 ring-emerald-500/20'
                  : isPullingActive
                  ? 'border-amber-500/50 ring-amber-500/20'
                  : 'border-zinc-700/80 ring-white/10'
              }`}
            >
              {/* Dialog Header */}
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                    isPullDone
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                      : isPullingActive
                      ? 'bg-amber-950/60 border-amber-800 text-amber-400'
                      : 'bg-indigo-950/60 border-indigo-800 text-indigo-400'
                  }`}
                >
                  {isPullDone ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : isPullingActive ? (
                    <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5 text-indigo-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-zinc-100">
                    {isPullDone
                      ? 'Download Complete & Ready!'
                      : isPullingActive
                      ? 'Downloading Model Weights...'
                      : 'Pull Required to Chat'}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {isPullDone ? (
                      <span>
                        <span className="font-mono text-emerald-300 font-semibold">{unpulledPrompt.fullTag}</span> is downloaded and verified.
                      </span>
                    ) : isPullingActive ? (
                      <span>
                        Pulling <span className="font-mono text-amber-300 font-semibold">{unpulledPrompt.fullTag}</span> to your local machine.
                      </span>
                    ) : (
                      <span>
                        You selected <span className="font-mono text-amber-300 font-semibold">{unpulledPrompt.fullTag}</span>. Pull to start chatting.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Model Info Summary */}
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs space-y-1.5 text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Model:</span>
                  <span className="font-medium text-zinc-200">{unpulledPrompt.modelName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Parameter Size:</span>
                  <span className="font-mono text-indigo-300 font-semibold">
                    {unpulledPrompt.tag}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Status:</span>
                  <span
                    className={`font-medium ${
                      isPullDone
                        ? 'text-emerald-400'
                        : isPullingActive
                        ? 'text-amber-300'
                        : 'text-zinc-400'
                    }`}
                  >
                    {isPullDone
                      ? 'Downloaded & Ready'
                      : isPullingActive
                      ? (activePromptPull?.status || 'Downloading...')
                      : 'Download Required'}
                  </span>
                </div>
              </div>

              {/* LIVE LOADING BAR: Stays persistent while download is active or done */}
              {activePromptPull ? (
                <div className="space-y-2 bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/90">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {isPullDone ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                      )}
                      <span className={`font-semibold truncate ${isPullDone ? 'text-emerald-300' : 'text-amber-300'}`}>
                        {activePromptPull.status}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-xs shrink-0 text-zinc-200">
                      {activePromptPull.percent}%
                    </span>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden shadow-inner">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-300 ease-out ${
                        isPullDone
                          ? 'bg-emerald-400'
                          : 'bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400'
                      }`}
                      style={{ width: `${Math.max(8, activePromptPull.percent)}%` }}
                    />
                  </div>

                  {/* Byte download stats */}
                  {activePromptPull.completed && activePromptPull.total ? (
                    <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
                      <span>{Math.round(activePromptPull.completed / 1024 / 1024)} MB downloaded</span>
                      <span>Total: {Math.round(activePromptPull.total / 1024 / 1024)} MB</span>
                    </div>
                  ) : null}

                  <p className="text-[11px] text-zinc-400 pt-0.5">
                    {isPullDone
                      ? 'Download complete! You can start chatting with this model now.'
                      : 'Download is actively in progress. This page stays here until the process finishes, or you can choose to leave anytime.'}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-400">
                  Click below to pull this model. The live loading bar will track progress directly on this screen until the download finishes.
                </p>
              )}

              {/* Action Buttons: No remote proxy options */}
              <div className="flex flex-col gap-2 pt-1">
                {isPullDone ? (
                  <div className="flex gap-2">
                    <button
                      id="start-chatting-now-btn"
                      onClick={() => {
                        onSelectModel(unpulledPrompt.fullTag);
                        setUnpulledPrompt(null);
                        onClose();
                      }}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                    >
                      <Check className="w-4 h-4 text-zinc-950" />
                      <span>Start Chatting with {unpulledPrompt.fullTag}</span>
                    </button>
                    <button
                      onClick={() => {
                        onSelectModel(unpulledPrompt.fullTag);
                        setUnpulledPrompt(null);
                      }}
                      className="py-2.5 px-3 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs transition-colors"
                      title="Keep Model Hub open"
                    >
                      Keep in Hub
                    </button>
                  </div>
                ) : isPullingActive ? (
                  <div className="flex gap-2">
                    <button
                      id="leave-page-bg-btn"
                      onClick={() => setUnpulledPrompt(null)}
                      className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Continue in Background</span>
                    </button>
                    <button
                      onClick={() => {
                        setPullingModels((prev) => {
                          const next = { ...prev };
                          delete next[unpulledPrompt.fullTag];
                          return next;
                        });
                        setUnpulledPrompt(null);
                      }}
                      className="py-2 px-3 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      id="confirm-pull-download-btn"
                      onClick={handleConfirmPullFromPrompt}
                      className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                    >
                      <Download className="w-4 h-4 text-zinc-950" />
                      <span>Download &amp; Pull {unpulledPrompt.fullTag}</span>
                    </button>
                    <button
                      onClick={() => setUnpulledPrompt(null)}
                      className="py-2 px-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* CONFIRMATION DIALOG: Delete Pulled Model */}
      {deleteConfirmModel && (
        <div
          id="delete-model-dialog"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in"
        >
          <div className="bg-zinc-900 border border-red-500/40 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 ring-1 ring-red-500/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-800/80 text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Delete Pulled Model?
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Are you sure you want to delete{' '}
                  <span className="font-mono text-red-300 font-semibold">
                    {deleteConfirmModel}
                  </span>{' '}
                  from your pulled models repository?
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-400">
              This will remove the model profile and delete local cached weights. You can re-pull it
              anytime from the online library.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmModel(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-model-btn"
                onClick={handleExecuteDeletePulled}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-lg shadow-red-600/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Model</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
