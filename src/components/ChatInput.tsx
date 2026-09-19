import React, { useState, useRef, useEffect } from 'react';
import { Send, CornerDownLeft, Sparkles } from 'lucide-react';
import { QuickContextPrompts } from './QuickContextPrompts';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setText('');
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
    onSendMessage(prompt);
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-900/90 backdrop-blur-md px-4 py-3 sticky bottom-0">
      <div className="max-w-3xl mx-auto space-y-2">
        <QuickContextPrompts onSelectPrompt={handleSelectPrompt} disabled={isLoading} />

        <div className="relative flex items-end gap-2 bg-zinc-950 border border-zinc-800 focus-within:border-indigo-500/60 focus-within:ring-1 focus-within:ring-indigo-500/40 rounded-2xl p-2 transition-all">
          <textarea
            id="chat-message-input"
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="What's on your mind? (Shift + Enter for newline)"
            className="flex-1 bg-transparent border-0 resize-none text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none px-3 py-1.5 max-h-36 leading-relaxed disabled:opacity-50"
          />

          <button
            id="send-message-btn"
            type="button"
            onClick={handleSend}
            disabled={isLoading || !text.trim()}
            className="h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shrink-0 transition-all disabled:opacity-30 disabled:pointer-events-none shadow-sm shadow-indigo-600/30"
            title="Send message"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between px-2 text-[11px] text-zinc-400">
          <span>Press Enter to send &bull; Persistent across sessions</span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Role: Loyal Companion</span>
          </span>
        </div>
      </div>
    </div>
  );
};
