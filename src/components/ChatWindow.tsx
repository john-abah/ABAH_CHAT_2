import React, { useEffect, useRef } from 'react';
import { Bot, User, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Filter out any empty placeholder message if present
  const validMessages = messages.filter((m) => m.content && m.content.trim().length > 0);

  if (validMessages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/20 ring-1 ring-white/20">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-zinc-950 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-zinc-100 tracking-tight mb-2">
            Welcome to ABAH CHAT
          </h2>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            Your personal loyal companion with persistent local memory. Every conversation is saved to <code className="text-indigo-300 bg-indigo-950/50 px-1.5 py-0.5 rounded text-xs">memory.json</code> so you can resume anytime or seamlessly switch models.
          </p>

          <div className="w-full grid gap-2 text-left">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">
              Suggested conversations:
            </p>
            {[
              "Hello! Let's plan our project goals for this week.",
              "Can you give me a 3-step strategy for learning TypeScript?",
              "Remember this: My favorite programming language is Python and I am building an AI app.",
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
            <span>Persistent history retained across reloads</span>
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
          return (
            <div
              key={msg.id || index}
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
                  <div className="flex items-center gap-2 mb-1">
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

                <div className="whitespace-pre-wrap break-words">{msg.content}</div>

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
              <span className="text-xs text-zinc-500 ml-1">chatter is thinking...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
