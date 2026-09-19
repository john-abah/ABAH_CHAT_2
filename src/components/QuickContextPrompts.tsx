import React from 'react';
import { History, BookmarkCheck, Lightbulb, CornerDownLeft } from 'lucide-react';

interface QuickContextPromptsProps {
  onSelectPrompt: (prompt: string) => void;
  disabled: boolean;
}

const PROMPTS = [
  {
    icon: History,
    label: 'Where did we leave off last time?',
    prompt: 'Where did we leave off last time?',
  },
  {
    icon: BookmarkCheck,
    label: 'Summarize our previous conversation',
    prompt: 'Summarize our previous conversation and key takeaways.',
  },
  {
    icon: Lightbulb,
    label: 'What topics have we discussed so far?',
    prompt: 'What topics have we discussed so far in this session?',
  },
];

export const QuickContextPrompts: React.FC<QuickContextPromptsProps> = ({
  onSelectPrompt,
  disabled,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 scrollbar-none">
      <span className="text-[11px] font-medium text-zinc-400 shrink-0 flex items-center gap-1">
        <CornerDownLeft className="w-3 h-3 text-indigo-400" />
        Quick Context:
      </span>
      {PROMPTS.map((p, idx) => {
        const Icon = p.icon;
        return (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPrompt(p.prompt)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 text-zinc-300 hover:text-white transition-all shrink-0 disabled:opacity-40 disabled:pointer-events-none hover:border-indigo-500/40"
          >
            <Icon className="w-3 h-3 text-indigo-400" />
            <span>{p.label}</span>
          </button>
        );
      })}
    </div>
  );
};
