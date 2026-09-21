import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileJson,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  RefreshCw,
  ArrowRight,
  Bot,
  User,
} from 'lucide-react';
import { ChatMessage, MemoryState } from '../types';

interface ImportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (newMemory: MemoryState, messageCount: number) => void;
}

export const ImportChatModal: React.FC<ImportChatModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pasteContent, setPasteContent] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [parsedMessages, setParsedMessages] = useState<ChatMessage[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const parseRawContent = (raw: string, sourceName = 'pasted_text.json') => {
    setParseError(null);
    const trimmed = raw.trim();
    if (!trimmed) {
      setParsedMessages(null);
      return;
    }

    try {
      // 1. Try JSON parsing first
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);

        let extracted: any[] = [];
        if (Array.isArray(parsed)) {
          extracted = parsed;
        } else if (parsed.llm_context && Array.isArray(parsed.llm_context.messages)) {
          extracted = parsed.llm_context.messages;
        } else if (Array.isArray(parsed.messages)) {
          extracted = parsed.messages;
        } else if (parsed.history && Array.isArray(parsed.history)) {
          extracted = parsed.history;
        } else {
          throw new Error('JSON does not contain a recognizable messages array');
        }

        const normalized: ChatMessage[] = extracted
          .filter((item) => item && (item.content || item.text || item.message))
          .map((item, idx) => {
            const content = String(item.content || item.text || item.message || '').trim();
            const role = (item.source || item.role || item.sender || '').toLowerCase();
            const isUser = role === 'user' || role === 'human' || item.type === 'UserMessage';
            const timestamp = item.timestamp || new Date(Date.now() - (extracted.length - idx) * 60000).toISOString();

            return {
              id: item.id || `imported-${Date.now()}-${idx}`,
              content,
              source: isUser ? 'user' : 'chatter',
              type: isUser ? 'UserMessage' : 'AssistantMessage',
              timestamp,
              attachments: item.attachments || undefined,
              sources: item.sources || undefined,
            };
          });

        if (normalized.length === 0) {
          throw new Error('No valid chat messages could be extracted from this JSON');
        }

        setParsedMessages(normalized);
        return;
      }

      // 2. Try parsing plain text or Markdown format (e.g. "User: ..." or "Assistant: ...")
      const lines = trimmed.split('\n');
      const textMessages: ChatMessage[] = [];
      let currentRole: 'user' | 'chatter' = 'user';
      let currentContent: string[] = [];

      const flushMessage = () => {
        if (currentContent.length > 0) {
          const content = currentContent.join('\n').trim();
          if (content) {
            textMessages.push({
              id: `imported-txt-${Date.now()}-${textMessages.length}`,
              content,
              source: currentRole,
              type: currentRole === 'user' ? 'UserMessage' : 'AssistantMessage',
              timestamp: new Date(Date.now() - (100 - textMessages.length) * 60000).toISOString(),
            });
          }
          currentContent = [];
        }
      };

      for (const line of lines) {
        const userMatch = line.match(/^(?:###\s*)?(?:User|Human|You):\s*(.*)$/i);
        const assistantMatch = line.match(/^(?:###\s*)?(?:Assistant|Chatter|Bot|AI|Model):\s*(.*)$/i);

        if (userMatch) {
          flushMessage();
          currentRole = 'user';
          if (userMatch[1]) currentContent.push(userMatch[1]);
        } else if (assistantMatch) {
          flushMessage();
          currentRole = 'chatter';
          if (assistantMatch[1]) currentContent.push(assistantMatch[1]);
        } else {
          currentContent.push(line);
        }
      }
      flushMessage();

      if (textMessages.length > 0) {
        setParsedMessages(textMessages);
      } else {
        throw new Error(
          'Could not identify message roles. Ensure messages start with "User:" or "Assistant:", or upload a JSON export.'
        );
      }
    } catch (err: any) {
      setParsedMessages(null);
      setParseError(err.message || 'Failed to parse chat history file');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseRawContent(text, file.name);
    };
    reader.onerror = () => {
      setParseError('Failed to read file from disk');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseRawContent(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!parsedMessages || parsedMessages.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/memory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: parsedMessages,
          mode: importMode,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      onImportSuccess(data.memory, data.count || parsedMessages.length);
      onClose();
    } catch (err: any) {
      setParseError(err.message || 'Import failed. Please verify format.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const userCount = parsedMessages?.filter((m) => m.source === 'user').length || 0;
  const chatterCount = parsedMessages?.filter((m) => m.source === 'chatter').length || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                Import Chat History
              </h2>
              <p className="text-xs text-zinc-400">
                Load previous conversations into persistent memory (.json, .txt, or .md)
              </p>
            </div>
          </div>
          <button
            id="close-import-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 border-b border-zinc-800/80 bg-zinc-950/40 flex gap-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            Upload File
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'paste'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Paste Text or JSON
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'upload' ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-950/30'
                  : 'border-zinc-700/80 hover:border-zinc-600 bg-zinc-950/50 hover:bg-zinc-900/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.txt,.md"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-1">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-zinc-200">
                Click or drag & drop chat export file here
              </p>
              <p className="text-xs text-zinc-400 max-w-sm">
                Supports <code className="text-indigo-300 bg-zinc-800 px-1.5 py-0.5 rounded">memory.json</code>, ChatGPT exports, or exported chat transcripts
              </p>
              {fileName && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-800/90 border border-zinc-700 text-xs text-zinc-200 font-mono">
                  <FileJson className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{fileName}</span>
                  <span className="text-zinc-400">({fileSize})</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                <span>Paste Raw JSON or Text Transcript</span>
                <span className="text-zinc-500 text-[11px]">Format: JSON or User/Assistant text</span>
              </label>
              <textarea
                value={pasteContent}
                onChange={(e) => {
                  setPasteContent(e.target.value);
                  parseRawContent(e.target.value);
                }}
                rows={6}
                placeholder={`Example JSON:\n{\n  "llm_context": {\n    "messages": [\n      {"source": "user", "content": "Hello!"},\n      {"source": "chatter", "content": "Hi there!"}\n    ]\n  }\n}`}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl p-3 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none leading-relaxed"
              />
            </div>
          )}

          {/* Parse Error Notice */}
          {parseError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-200">Validation Error</p>
                <p className="text-red-300/90 text-[11px] mt-0.5">{parseError}</p>
              </div>
            </div>
          )}

          {/* Parsed Preview Section */}
          {parsedMessages && parsedMessages.length > 0 && (
            <div className="space-y-3 bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-zinc-100">
                    {parsedMessages.length} Messages Detected
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
                  <span className="bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 px-2 py-0.5 rounded">
                    {userCount} User
                  </span>
                  <span className="bg-purple-950/60 text-purple-300 border border-purple-800/60 px-2 py-0.5 rounded">
                    {chatterCount} Chatter
                  </span>
                </div>
              </div>

              {/* Message preview list */}
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 text-xs">
                {parsedMessages.slice(0, 6).map((msg, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/70 flex items-start gap-2"
                  >
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 text-[10px] ${
                        msg.source === 'user'
                          ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
                          : 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {msg.source === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-0.5">
                        <span className="font-semibold text-zinc-300 uppercase">
                          {msg.source}
                        </span>
                        {msg.timestamp && (
                          <span className="flex items-center gap-1 text-zinc-500">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(msg.timestamp).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-200 text-xs line-clamp-2 break-words">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
                {parsedMessages.length > 6 && (
                  <p className="text-[11px] text-zinc-500 text-center py-1 italic">
                    + {parsedMessages.length - 6} more messages...
                  </p>
                )}
              </div>

              {/* Import Mode Selection */}
              <div className="pt-2 border-t border-zinc-800/80">
                <label className="text-xs font-semibold text-zinc-300 block mb-2">
                  Import Action:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode('merge')}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      importMode === 'merge'
                        ? 'bg-indigo-950/40 border-indigo-500/80 text-indigo-100 ring-1 ring-indigo-500/50'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-zinc-200">Merge with Existing</div>
                      <div className="text-[11px] text-zinc-400">
                        Appends without losing your current memory
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      importMode === 'replace'
                        ? 'bg-amber-950/40 border-amber-500/80 text-amber-100 ring-1 ring-amber-500/50'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-zinc-200">Replace Current</div>
                      <div className="text-[11px] text-zinc-400">
                        Overwrites active memory with imported chats
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
          >
            Cancel
          </button>

          <button
            id="confirm-import-chat-btn"
            type="button"
            onClick={handleConfirmImport}
            disabled={!parsedMessages || parsedMessages.length === 0 || isSubmitting}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:pointer-events-none shadow-md shadow-indigo-600/30"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <span>Import {parsedMessages?.length || 0} Messages</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
