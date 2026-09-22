import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  User,
  Clock,
  ShieldCheck,
  Sparkles,
  Paperclip,
  FileText,
  FileCode,
  Image as ImageIcon,
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Eye,
  X,
} from 'lucide-react';
import { ChatMessage, ChatAttachment, SearchSource } from '../types';

interface ChatWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSelectPrompt: (prompt: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isLoading,
  onSelectPrompt,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [activeFilePreview, setActiveFilePreview] = useState<ChatAttachment | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const toggleSources = (key: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Filter out any empty placeholder message if present
  const validMessages = messages.filter(
    (m) =>
      (m.content && m.content.trim().length > 0) ||
      (m.attachments && m.attachments.length > 0)
  );

  if (validMessages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/30 ring-2 ring-indigo-500/40 relative group bg-zinc-950 flex items-center justify-center">
              <img
                src="/ABAH_CHAT_AD.png"
                alt="ABAH CHAT"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  const fallback = parent?.querySelector('.empty-bot-fallback');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
              <div className="empty-bot-fallback hidden w-full h-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-10 h-10 text-white" />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-2 border-zinc-950 flex items-center justify-center shadow-md">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-zinc-100 tracking-tight mb-2">
            Welcome to ABAH CHAT
          </h2>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            Your personal companion with persistent memory, file analysis, and live web search. Every conversation is saved so you can resume anytime or seamlessly switch local models.
          </p>

          <div className="w-full grid gap-2 text-left">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">
              Suggested queries & features:
            </p>
            {[
              "🌐 Search the internet: What are the latest developments in AI models this month?",
              "📎 Let me attach a code file or document to get an explanation or refactoring advice.",
              "Remember this: My main project is building a high-performance local AI assistant.",
            ].map((starter, i) => (
              <button
                key={i}
                onClick={() => onSelectPrompt(starter)}
                className="w-full text-left text-xs p-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-700 text-zinc-300 transition-all flex items-center justify-between group"
              >
                <span>{starter}</span>
                <span className="text-zinc-500 group-hover:text-indigo-400 transition-colors ml-2 font-mono text-sm">
                  &rarr;
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-2 text-[11px] text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Persistent history &bull; File context &bull; DuckDuckGo web search</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
      <div className="max-w-3xl mx-auto space-y-4">
        {validMessages.map((msg, index) => {
          const isUser = msg.source === 'user';
          const msgKey = msg.id || `msg-${index}`;
          const isSourceExpanded = expandedSources[msgKey] ?? true;

          return (
            <div
              key={msgKey}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-indigo-400" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-br-sm shadow-md'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-sm shadow-sm'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wide">
                      chatter
                    </span>
                    {msg.timestamp && (
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                )}

                {/* Attached Files Preview in Message */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mb-2.5 space-y-1.5">
                    <div className="flex flex-wrap gap-2">
                      {msg.attachments.map((att, attIdx) => (
                        <div
                          key={attIdx}
                          className={`flex items-center gap-2 rounded-xl p-2 text-xs border ${
                            isUser
                              ? 'bg-indigo-700/60 border-indigo-400/40 text-white'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-200'
                          }`}
                        >
                          {att.isImage && att.content ? (
                            <img
                              src={att.content}
                              alt={att.name}
                              onClick={() => setActiveFilePreview(att)}
                              className="w-8 h-8 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity border border-white/20"
                            />
                          ) : (
                            <div className="p-1 rounded bg-black/20">
                              <FileText className="w-4 h-4 text-indigo-300" />
                            </div>
                          )}

                          <div className="min-w-0 pr-1">
                            <p className="font-mono text-xs truncate max-w-[140px]" title={att.name}>
                              {att.name}
                            </p>
                            <p className="text-[10px] opacity-75 font-mono">
                              {formatFileSize(att.size)}
                            </p>
                          </div>

                          {att.content && (
                            <button
                              type="button"
                              onClick={() => setActiveFilePreview(att)}
                              className={`p-1 rounded hover:bg-black/30 text-[11px] flex items-center gap-1 transition-colors ${
                                isUser ? 'text-indigo-100' : 'text-zinc-400 hover:text-zinc-200'
                              }`}
                              title="Inspect file content"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Content */}
                {msg.content && (
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                )}

                {/* Web Search Sources Accordion */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-800/80">
                    <button
                      type="button"
                      onClick={() => toggleSources(msgKey)}
                      className="w-full flex items-center justify-between text-xs text-emerald-400 bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-800/50 rounded-xl px-2.5 py-1.5 transition-colors"
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        <Globe className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          {msg.sources.length} Web Source{msg.sources.length === 1 ? '' : 's'}{' '}
                          Grounding
                        </span>
                        {msg.searchQuery && (
                          <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline truncate max-w-[200px]">
                            &ldquo;{msg.searchQuery}&rdquo;
                          </span>
                        )}
                      </span>
                      {isSourceExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </button>

                    {isSourceExpanded && (
                      <div className="mt-2 space-y-1.5 text-xs animate-in fade-in">
                        {msg.sources.map((src, sIdx) => (
                          <div
                            key={sIdx}
                            className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-2.5 transition-all hover:border-zinc-700"
                          >
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-emerald-300 hover:text-emerald-200 hover:underline flex items-center gap-1.5 break-all"
                            >
                              <span>{src.title || src.url}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                            {src.snippet && (
                              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                                {src.snippet}
                              </p>
                            )}
                            <div className="text-[10px] text-zinc-500 font-mono mt-1 truncate">
                              {src.url}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {isUser && msg.timestamp && (
                  <div className="text-[10px] text-indigo-200/70 text-right mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-zinc-300" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-zinc-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse [animation-delay:0.4s]" />
              <span className="text-xs text-zinc-400 ml-1">chatter is thinking &amp; inferencing...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Full Content Preview Modal for Attached Files */}
      {activeFilePreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-mono font-semibold text-zinc-200 truncate max-w-sm">
                  {activeFilePreview.name}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  ({formatFileSize(activeFilePreview.size)})
                </span>
              </div>
              <button
                onClick={() => setActiveFilePreview(null)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-zinc-950">
              {activeFilePreview.isImage && activeFilePreview.content ? (
                <div className="flex justify-center items-center py-4">
                  <img
                    src={activeFilePreview.content}
                    alt={activeFilePreview.name}
                    className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-lg"
                  />
                </div>
              ) : (
                <pre className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed text-zinc-300 whitespace-pre-wrap">
                  {activeFilePreview.content || '(No preview content available)'}
                </pre>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-zinc-800 bg-zinc-950/60 flex justify-end">
              <button
                onClick={() => setActiveFilePreview(null)}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
