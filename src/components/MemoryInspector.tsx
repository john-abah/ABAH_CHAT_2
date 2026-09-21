import React, { useState } from 'react';
import { X, Copy, Check, Download, UploadCloud, Database, FileCode2 } from 'lucide-react';
import { MemoryState } from '../types';

interface MemoryInspectorProps {
  memory: MemoryState | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenImport?: () => void;
}

export const MemoryInspector: React.FC<MemoryInspectorProps> = ({
  memory,
  isOpen,
  onClose,
  onOpenImport,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const jsonString = memory ? JSON.stringify(memory, null, 2) : '{\n  "messages": []\n}';
  const totalMessages = memory?.llm_context?.messages?.length || 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'memory.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Database className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                Persistent Memory State
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                  memory.json
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                {totalMessages} message{totalMessages === 1 ? '' : 's'} recorded in state
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="copy-memory-btn"
              onClick={handleCopy}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1.5 border border-zinc-700/60 transition-colors"
              title="Copy JSON to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              id="download-memory-btn"
              onClick={handleDownload}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1.5 border border-zinc-700/60 transition-colors"
              title="Download memory.json"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            {onOpenImport && (
              <button
                id="import-memory-btn"
                onClick={() => {
                  onClose();
                  onOpenImport();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 text-xs flex items-center gap-1.5 border border-indigo-700/60 transition-colors"
                title="Import chat history into memory"
              >
                <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
                <span>Import</span>
              </button>
            )}

            <button
              id="close-memory-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto font-mono text-xs text-zinc-300 bg-zinc-950/70">
          <pre className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl overflow-x-auto text-[11px] leading-relaxed text-zinc-300">
            {jsonString}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <FileCode2 className="w-3.5 h-3.5 text-zinc-500" />
            Format: AssistantAgentState v1.0.0
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
