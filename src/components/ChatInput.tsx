import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Globe,
  X,
  FileText,
  FileCode,
  Image as ImageIcon,
  Sparkles,
  Search,
  Link2,
} from 'lucide-react';
import { QuickContextPrompts } from './QuickContextPrompts';
import { SharedChatModal } from './SharedChatModal';
import { ChatAttachment, SharedChatConversation, MemoryState } from '../types';

interface ChatInputProps {
  onSendMessage: (
    message: string,
    attachments?: ChatAttachment[],
    webSearch?: boolean,
    sharedChat?: SharedChatConversation
  ) => void;
  isLoading: boolean;
  onImportSharedChat?: (newMemory: MemoryState, count: number) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  onImportSharedChat,
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [sharedChat, setSharedChat] = useState<SharedChatConversation | null>(null);
  const [isSharedModalOpen, setIsSharedModalOpen] = useState(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Check if current text contains an OpenAI share link
  const detectedSharedUrlMatch =
    text.match(/https?:\/\/(?:www\.)?(?:chatgpt\.com|chat\.openai\.com)\/share\/[a-zA-Z0-9_-]+/i);
  const detectedUrl = detectedSharedUrlMatch ? detectedSharedUrlMatch[0] : null;

  const processFile = async (file: File): Promise<ChatAttachment> => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve({
            name: file.name,
            type: file.type || (isPdf ? 'application/pdf' : isImage ? 'image/jpeg' : 'text/plain'),
            size: file.size,
            content: result,
            isImage,
          });
        } else {
          reject(new Error('Failed to read file'));
        }
      };

      reader.onerror = () => reject(new Error('File reading error'));

      if (isImage || isPdf) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const handleFileSelect = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;
    setFileError(null);

    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const newAttachments: ChatAttachment[] = [];

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      if (file.size > maxFileSize) {
        setFileError(`File "${file.name}" exceeds the 10MB limit.`);
        continue;
      }

      try {
        const processed = await processFile(file);
        newAttachments.push(processed);
      } catch (err) {
        console.error('Error processing file:', err);
        setFileError(`Could not read file "${file.name}".`);
      }
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0 && !sharedChat) || isLoading) return;

    // If user attached files or shared chat without typing text, default to an intuitive request
    const messageToSend =
      trimmed ||
      (sharedChat
        ? `Please analyze this shared ${sharedChat.provider} conversation ("${sharedChat.title}", ${sharedChat.turnCount} turns) and provide key insights.`
        : attachments.length > 0
        ? `Please analyze and summarize the attached ${attachments.length === 1 ? 'file' : `${attachments.length} files`}.`
        : '');

    onSendMessage(messageToSend, attachments, isWebSearchEnabled, sharedChat || undefined);
    setText('');
    setAttachments([]);
    setSharedChat(null);
    setFileError(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectPrompt = (prompt: string) => {
    onSendMessage(prompt, attachments, isWebSearchEnabled, sharedChat || undefined);
  };

  const getFileIcon = (att: ChatAttachment) => {
    if (att.isImage) return <ImageIcon className="w-3.5 h-3.5 text-pink-400" />;
    const name = att.name.toLowerCase();
    if (name.endsWith('.pdf') || att.type === 'application/pdf') {
      return (
        <span className="flex items-center gap-1 font-bold text-[10px] text-red-400 bg-red-950/60 px-1 py-0.5 rounded border border-red-800/60">
          PDF
        </span>
      );
    }
    if (
      name.endsWith('.js') ||
      name.endsWith('.ts') ||
      name.endsWith('.tsx') ||
      name.endsWith('.jsx') ||
      name.endsWith('.py') ||
      name.endsWith('.html') ||
      name.endsWith('.css') ||
      name.endsWith('.json') ||
      name.endsWith('.sh')
    ) {
      return <FileCode className="w-3.5 h-3.5 text-amber-400" />;
    }
    return <FileText className="w-3.5 h-3.5 text-indigo-400" />;
  };

  return (
    <div
      className={`border-t border-zinc-800 bg-zinc-900/90 backdrop-blur-md px-4 py-3 sticky bottom-0 transition-colors ${
        isDragging ? 'bg-indigo-950/40 border-indigo-500' : ''
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files);
      }}
    >
      <div className="max-w-3xl mx-auto space-y-2">
        <QuickContextPrompts onSelectPrompt={handleSelectPrompt} disabled={isLoading} />

        {/* Attachments & Shared Chat List Preview */}
        {(attachments.length > 0 || sharedChat) && (
          <div className="flex flex-wrap gap-2 pt-1 animate-in fade-in">
            {/* Attached Shared Chat Badge */}
            {sharedChat && (
              <div className="flex items-center gap-2 bg-blue-950/60 border border-blue-700/80 rounded-xl px-2.5 py-1.5 text-xs text-blue-200 group shadow-sm">
                <Link2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="font-semibold text-blue-300 max-w-[180px] truncate" title={sharedChat.title}>
                  {sharedChat.title}
                </span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono">
                  {sharedChat.provider} &bull; {sharedChat.turnCount} turns
                </span>
                <button
                  type="button"
                  onClick={() => setSharedChat(null)}
                  className="text-blue-400 hover:text-red-400 p-0.5 rounded transition-colors ml-1"
                  title="Remove shared chat"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* File Attachments */}
            {attachments.map((att, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 group shadow-sm"
              >
                {att.isImage && att.content ? (
                  <img
                    src={att.content}
                    alt={att.name}
                    className="w-5 h-5 rounded object-cover border border-zinc-700"
                  />
                ) : (
                  getFileIcon(att)
                )}
                <span className="font-mono text-xs max-w-[160px] truncate" title={att.name}>
                  {att.name}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {formatFileSize(att.size)}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(i)}
                  className="text-zinc-500 hover:text-red-400 p-0.5 rounded transition-colors"
                  title="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Auto-detected shared link prompt banner */}
        {detectedUrl && !sharedChat && (
          <div className="flex items-center justify-between text-xs bg-blue-950/40 border border-blue-800/60 rounded-xl px-3 py-1.5 text-blue-200 animate-in fade-in">
            <span className="flex items-center gap-1.5 truncate">
              <Link2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate">
                Shared AI Link detected in input (<code className="font-mono text-blue-300">{detectedUrl}</code>)
              </span>
            </span>
            <button
              type="button"
              onClick={() => setIsSharedModalOpen(true)}
              className="text-blue-400 hover:text-blue-200 font-medium underline underline-offset-2 ml-2 shrink-0 text-[11px]"
            >
              Inspect / Attach
            </button>
          </div>
        )}

        {/* File Error Notice */}
        {fileError && (
          <div className="text-[11px] text-red-400 bg-red-950/40 border border-red-800/60 rounded-lg px-2.5 py-1 flex items-center justify-between">
            <span>{fileError}</span>
            <button
              onClick={() => setFileError(null)}
              className="text-red-400 hover:text-red-300 ml-2"
            >
              &times;
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="relative flex flex-col bg-zinc-950 border border-zinc-800 focus-within:border-indigo-500/60 focus-within:ring-1 focus-within:ring-indigo-500/40 rounded-2xl p-2 transition-all">
          <textarea
            id="chat-message-input"
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={
              sharedChat
                ? `Ask questions, infer on, or summarize "${sharedChat.title}"...`
                : attachments.length > 0
                ? "Ask a question about the attached file(s)..."
                : isWebSearchEnabled
                ? "Search the internet or ask any live question..."
                : "What's on your mind? (Shift + Enter for newline)"
            }
            className="w-full bg-transparent border-0 resize-none text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none px-3 py-1.5 max-h-36 leading-relaxed disabled:opacity-50"
          />

          {/* Action Toolbar Inside Input Bar */}
          <div className="flex items-center justify-between pt-1 px-1.5 border-t border-zinc-900">
            {/* Left Controls: File Attachment, Shared Chat & Web Search */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => {
                  handleFileSelect(e.target.files);
                  if (e.target) e.target.value = '';
                }}
                className="hidden"
                accept=".pdf,.txt,.md,.py,.js,.ts,.tsx,.jsx,.json,.csv,.html,.css,.yaml,.yml,.sh,.log,.xml,.sql,image/*"
              />

              {/* Attach File Button */}
              <button
                type="button"
                id="attach-file-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all"
                title="Attach files (code, text, data, images, PDFs) for model inference"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Attach File</span>
              </button>

              {/* Shared Chat Link (OpenAI) Button */}
              <button
                type="button"
                id="open-shared-chat-btn"
                onClick={() => setIsSharedModalOpen(true)}
                disabled={isLoading}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                  sharedChat
                    ? 'bg-blue-950/60 text-blue-300 border border-blue-700/60 shadow-sm shadow-blue-950/50'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800'
                }`}
                title="Read, inspect, or infer on OpenAI ChatGPT shared link"
              >
                <Link2 className={`w-3.5 h-3.5 ${sharedChat ? 'text-blue-300' : 'text-blue-400'}`} />
                <span className="hidden sm:inline">Shared Chat</span>
                {sharedChat && (
                  <span className="text-[9px] px-1 rounded uppercase tracking-wider font-mono bg-blue-500/20 text-blue-300">
                    Active
                  </span>
                )}
              </button>

              {/* DuckDuckGo Web Search Toggle */}
              <button
                type="button"
                id="toggle-web-search-btn"
                onClick={() => setIsWebSearchEnabled((prev) => !prev)}
                disabled={isLoading}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                  isWebSearchEnabled
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/60 shadow-sm shadow-emerald-950/50'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800'
                }`}
                title="Toggle real-time web search (DuckDuckGo & live web grounding)"
              >
                <Globe
                  className={`w-3.5 h-3.5 ${
                    isWebSearchEnabled ? 'text-emerald-400 animate-pulse' : ''
                  }`}
                />
                <span>Web Search</span>
                <span
                  className={`text-[9px] px-1 rounded uppercase tracking-wider font-mono ${
                    isWebSearchEnabled
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {isWebSearchEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            {/* Right: Send Button */}
            <button
              id="send-message-btn"
              type="button"
              onClick={handleSend}
              disabled={isLoading || (!text.trim() && attachments.length === 0 && !sharedChat)}
              className="h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 shrink-0 transition-all disabled:opacity-30 disabled:pointer-events-none shadow-sm shadow-indigo-600/30 font-medium text-xs"
              title="Send message"
            >
              {isLoading ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer info line */}
        <div className="flex items-center justify-between px-2 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            {isWebSearchEnabled && (
              <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-800/40">
                <Search className="w-2.5 h-2.5" />
                <span>Internet Grounding Active</span>
              </span>
            )}
            <span>Paste ChatGPT link or drag files &bull; Enter to send</span>
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Persistent Memory Companion</span>
          </span>
        </div>
      </div>

      {/* Shared Chat Reader & Inference Modal */}
      <SharedChatModal
        isOpen={isSharedModalOpen}
        onClose={() => setIsSharedModalOpen(false)}
        onAttachToMessage={(conv) => {
          setSharedChat(conv);
          if (!text.trim()) {
            setText(`Please review and infer on this shared ${conv.provider} conversation: "${conv.title}".`);
          }
        }}
        onImportToMemory={(newMem, count) => {
          if (onImportSharedChat) {
            onImportSharedChat(newMem, count);
          }
        }}
        onDirectInfer={(promptText, conv) => {
          setSharedChat(conv);
          onSendMessage(promptText, attachments, isWebSearchEnabled, conv);
        }}
      />
    </div>
  );
};
