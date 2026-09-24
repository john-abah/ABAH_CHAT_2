import React, { useState } from 'react';
import {
  X,
  Link2,
  ExternalLink,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  FileCheck,
  Send,
} from 'lucide-react';
import { SharedChatConversation, MemoryState } from '../types';

interface SharedChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttachToMessage: (conversation: SharedChatConversation) => void;
  onImportToMemory?: (newMemory: MemoryState, count: number) => void;
  onDirectInfer?: (prompt: string, conversation: SharedChatConversation) => void;
}

export const SharedChatModal: React.FC<SharedChatModalProps> = ({
  isOpen,
  onClose,
  onAttachToMessage,
  onImportToMemory,
  onDirectInfer,
}) => {
  const [inputMode, setInputMode] = useState<'url' | 'text'>('url');
  const [url, setUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [pastedTitle, setPastedTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<SharedChatConversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFetchUrl = async () => {
    const fetchUrl = url.trim();
    if (!fetchUrl) {
      setError('Please enter a valid shared chat link (ChatGPT, Claude, Perplexity, etc.).');
      return;
    }

    setError(null);
    setImportSuccess(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/shared-chat/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fetchUrl }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch (Status ${res.status})`);
      }

      const data = await res.json();
      if (!data.conversation || !Array.isArray(data.conversation.messages) || data.conversation.messages.length === 0) {
        throw new Error('No conversational turns could be extracted from this URL. If the page is private or protected, switch to the "Paste Transcript" tab above to paste the conversation directly.');
      }

      setConversation(data.conversation);
    } catch (err: any) {
      console.error('Error fetching shared chat:', err);
      setError(
        err.message ||
          'Failed to extract conversation. If the link is protected, try pasting the transcript text directly.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleParseText = async () => {
    const raw = pastedText.trim();
    if (!raw) {
      setError('Please paste conversation text, dialogue transcript, or JSON export.');
      return;
    }

    setError(null);
    setImportSuccess(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/shared-chat/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: raw, title: pastedTitle.trim() || undefined }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Parse failed (Status ${res.status})`);
      }

      const data = await res.json();
      if (!data.conversation || !Array.isArray(data.conversation.messages) || data.conversation.messages.length === 0) {
        throw new Error('No conversational messages were detected in the pasted text.');
      }

      setConversation(data.conversation);
    } catch (err: any) {
      setError(err.message || 'Failed to parse conversation text.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttach = () => {
    if (!conversation) return;
    onAttachToMessage(conversation);
    onClose();
  };

  const handleImport = async (mode: 'append' | 'replace' = 'append') => {
    if (!conversation) return;
    setIsImporting(true);
    setError(null);

    try {
      const res = await fetch('/api/shared-chat/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation, mode }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Import failed (${res.status})`);
      }

      const data = await res.json();
      setImportSuccess(`Successfully imported ${data.importedCount} conversation turns into persistent memory!`);
      if (onImportToMemory && data.memory) {
        onImportToMemory(data.memory, data.importedCount);
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleQuickInfer = (promptText: string) => {
    if (!conversation) return;
    if (onDirectInfer) {
      onDirectInfer(promptText, conversation);
      onClose();
    } else {
      handleAttach();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <span>Read & Infer on Shared AI Chat</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Universal Shared Chat
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Inspect, quote, infer, or import conversations from ChatGPT, Claude, Perplexity, or pasted transcripts
              </p>
            </div>
          </div>
          <button
            id="close-shared-chat-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Bar with Mode Switcher */}
        <div className="p-6 border-b border-zinc-800/80 bg-zinc-950/40 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setInputMode('url')}
                className={`px-3 py-1 rounded-lg transition-all font-medium flex items-center gap-1.5 ${
                  inputMode === 'url'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Share Link URL</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode('text')}
                className={`px-3 py-1 rounded-lg transition-all font-medium flex items-center gap-1.5 ${
                  inputMode === 'text'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Paste Transcript / Text</span>
              </button>
            </div>
            <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline">
              ChatGPT &bull; Claude &bull; Perplexity &bull; Text
            </span>
          </div>

          {inputMode === 'url' ? (
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleFetchUrl();
                      }
                    }}
                    placeholder="Paste shared link (e.g. chatgpt.com/share/..., claude.ai/share/..., perplexity.ai/...)"
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/40 font-mono"
                  />
                </div>
                <button
                  id="fetch-shared-chat-btn"
                  onClick={handleFetchUrl}
                  disabled={isLoading || !url.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-blue-600/20 shrink-0"
                >
                  {isLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Extracting...</span>
                    </>
                  ) : (
                    <>
                      <span>Fetch & Read Chat</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
              <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Works with any shared chat link. If a website protects the page with captcha, switch to "Paste Transcript".</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={pastedTitle}
                onChange={(e) => setPastedTitle(e.target.value)}
                placeholder="Optional conversation title..."
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/40"
              />
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={4}
                placeholder="Paste conversation transcript text or JSON export here (e.g. 'User: ... Assistant: ...')"
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/40 font-mono resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParseText}
                  disabled={isLoading || !pastedText.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-blue-600/20"
                >
                  {isLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Parsing...</span>
                    </>
                  ) : (
                    <>
                      <span>Parse Conversation</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div>
                <span className="font-semibold">Notice: </span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Success Message */}
          {importSuccess && (
            <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <span className="font-semibold">Import Complete: </span>
                <span>{importSuccess}</span>
              </div>
            </div>
          )}
        </div>

        {/* Content Body: Extracted Chat Details & Turns */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {conversation ? (
            <div className="space-y-4">
              {/* Conversation Summary Card */}
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        conversation.provider === 'OpenAI ChatGPT'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {conversation.provider}
                    </span>
                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {conversation.messages.length} messages
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    <span>{conversation.title}</span>
                    <a
                      href={conversation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-500 hover:text-zinc-300"
                      title="Open original shared page"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </h3>
                  <p className="text-[11px] text-zinc-400 truncate max-w-xl font-mono">
                    {conversation.url}
                  </p>
                </div>

                {/* Primary Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    id="attach-shared-chat-btn"
                    onClick={handleAttach}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm shadow-blue-600/20"
                    title="Attach this shared chat to your current prompt input"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Attach & Ask AI</span>
                  </button>
                  <button
                    id="import-shared-chat-btn"
                    onClick={() => handleImport('append')}
                    disabled={isImporting}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-all border border-zinc-700"
                    title="Import full history into active session memory"
                  >
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{isImporting ? 'Importing...' : 'Save to Memory'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Inference Prompts */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Quick Inferences on this Shared Chat:</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Summarize the core agreements and questions in this conversation.',
                    'Draft a professional follow-up response continuing from the last message.',
                    'Extract all specific facts, numbers, dates, and locations mentioned.',
                    'Translate the key letters/messages into English and German.',
                  ].map((quickPrompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickInfer(quickPrompt)}
                      className="text-left text-[11px] bg-zinc-950 border border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-900 text-zinc-300 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 group"
                    >
                      <Send className="w-3 h-3 text-zinc-500 group-hover:text-blue-400 transition-colors shrink-0" />
                      <span>{quickPrompt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Turns Preview Header */}
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-xs font-semibold text-zinc-300">
                  Conversation Turns ({conversation.messages.length})
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Displaying chronological turns
                </span>
              </div>

              {/* Message List Preview */}
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {conversation.messages.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    className={`p-3 rounded-xl text-xs space-y-1 border ${
                      m.role === 'user'
                        ? 'bg-zinc-950/60 border-zinc-800/80 text-zinc-200'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <div className="flex items-center gap-1.5 font-semibold">
                        {m.role === 'user' ? (
                          <>
                            <User className="w-3 h-3 text-indigo-400" />
                            <span className="text-indigo-300">User (Turn {idx + 1})</span>
                          </>
                        ) : (
                          <>
                            <Bot className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-300">
                              {conversation.provider} Assistant (Turn {idx + 1})
                            </span>
                          </>
                        )}
                      </div>
                      {m.timestamp && (
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(m.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed text-zinc-300 max-h-48 overflow-y-auto font-sans">
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-950/40 text-zinc-500 space-y-2">
              <Link2 className="w-8 h-8 text-zinc-600 mb-1" />
              <p className="text-sm font-medium text-zinc-400">No conversation loaded yet</p>
              <p className="text-xs text-zinc-500 max-w-sm">
                Paste any shared chat link from ChatGPT or Claude above to extract its conversation
                dialogue and let ABAH CHAT infer on it.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs text-zinc-400">
          <span className="text-[11px]">
            {conversation ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Ready to infer or import into persistent memory</span>
              </span>
            ) : (
              <span>Tip: Paste any shared chat URL from ChatGPT, Claude, Perplexity, or paste raw transcript text</span>
            )}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
