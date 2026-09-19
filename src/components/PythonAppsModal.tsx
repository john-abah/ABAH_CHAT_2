import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Terminal,
  Download,
  Copy,
  Check,
  Code,
  FileCode,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Play,
  Settings,
  FolderArchive,
} from 'lucide-react';

interface PythonFileItem {
  name: string;
  path: string;
  category: string;
  content: string;
  size: number;
}

interface PythonAppsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PythonAppsModal: React.FC<PythonAppsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'ubuntu' | 'android' | 'code'>('ubuntu');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [files, setFiles] = useState<PythonFileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<PythonFileItem | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen]);

  const fetchFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const res = await fetch('/api/python/files');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        if (data.files && data.files.length > 0 && !selectedFile) {
          setSelectedFile(data.files[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load python files', e);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <div
      id="python-apps-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        id="python-apps-modal-dialog"
        className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/10"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-900/95">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-inner font-mono font-bold text-base">
              Py
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
                  ABAH CHAT &middot; Python Edition
                </h2>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  Ubuntu &amp; Android Apps
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Native Python standalone apps with persistent memory &amp; Ollama model hub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              id="download-python-zip-header-btn"
              href="/abah_chat_python.zip"
              download="abah_chat_python.zip"
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download ZIP Bundle</span>
            </a>

            <button
              id="close-python-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 py-2.5 bg-zinc-950 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              id="tab-ubuntu-app"
              onClick={() => setActiveTab('ubuntu')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'ubuntu'
                  ? 'bg-amber-600/90 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Ubuntu Linux App</span>
            </button>

            <button
              id="tab-android-app"
              onClick={() => setActiveTab('android')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'android'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
              <span>Android App (APK &amp; Termux)</span>
            </button>

            <button
              id="tab-python-code"
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'code'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Code className="w-3.5 h-3.5 text-indigo-300" />
              <span>Python Source Code ({files.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-zinc-400 hidden sm:flex items-center gap-2">
            <span className="text-zinc-500">Python 3.8+ &middot; Zero external dependencies required</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: UBUNTU LINUX APP */}
          {activeTab === 'ubuntu' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                      <span>🐧 Ubuntu Desktop Application</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60 font-mono">
                        .desktop + App Launcher
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Written in pure Python with the standard library. Seamlessly integrates with the Ubuntu GNOME Application Grid, system dock, and search.
                    </p>
                  </div>
                  <a
                    href="/abah_chat_python.zip"
                    download="abah_chat_python.zip"
                    className="px-3 py-1.5 rounded-lg bg-amber-600/90 hover:bg-amber-500 text-white text-xs font-medium flex items-center gap-1.5 shrink-0 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download App</span>
                  </a>
                </div>
              </div>

              {/* Step 1: 1-Click Install */}
              <div className="bg-zinc-950/60 border border-zinc-800/90 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200">
                    Method 1: 1-Click Desktop Installer (GNOME App Launcher)
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        'chmod +x install_ubuntu.sh && ./install_ubuntu.sh',
                        'ub_install'
                      )
                    }
                    className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'ub_install' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedKey === 'ub_install' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="bg-black/80 rounded-lg p-3 font-mono text-xs text-emerald-400 border border-zinc-800/80 flex items-center justify-between">
                  <code>chmod +x install_ubuntu.sh &amp;&amp; ./install_ubuntu.sh</code>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Registers <code className="text-zinc-300">abah-chat.desktop</code> in your Ubuntu application menu. You can press the Super (Windows) key and search &quot;ABAH CHAT&quot; to launch immediately.
                </p>
              </div>

              {/* Step 2: Direct CLI or Server launch */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Direct Python Launch</span>
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard('python3 python_app/main.py', 'ub_run')
                      }
                      className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                    >
                      {copiedKey === 'ub_run' ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="bg-black/80 rounded-lg p-2.5 font-mono text-xs text-indigo-300 border border-zinc-800">
                    <code>python3 python_app/main.py</code>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Runs native companion server and opens browser/webview automatically at <code className="text-zinc-300">http://localhost:8080</code>.
                  </p>
                </div>

                <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-amber-400" />
                      <span>Interactive Terminal Mode</span>
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard('python3 python_app/main.py --cli', 'ub_cli')
                      }
                      className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                    >
                      {copiedKey === 'ub_cli' ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="bg-black/80 rounded-lg p-2.5 font-mono text-xs text-amber-300 border border-zinc-800">
                    <code>python3 python_app/main.py --cli</code>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Chat with ABAH_CHAT directly in bash or zsh with commands <code className="text-zinc-300">/models</code>, <code className="text-zinc-300">/pull</code>, and persistent memory.
                  </p>
                </div>
              </div>

              {/* Ollama on Ubuntu */}
              <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-xl p-3 text-xs text-zinc-400 flex items-center justify-between gap-2">
                <span>
                  Ollama runs natively on Ubuntu: <code className="text-zinc-300">curl -fsSL https://ollama.com/install.sh | sh</code>
                </span>
                <a
                  href="https://ollama.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 shrink-0"
                >
                  <span>ollama.com</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: ANDROID APP */}
          {activeTab === 'android' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                      <span>🤖 Android Mobile Application</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-mono">
                        APK &middot; Termux &middot; PWA
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Available as a native compiled Android APK via Buildozer, or 1-tap execution directly on your Android phone using Termux.
                    </p>
                  </div>
                  <a
                    href="/abah_chat_python.zip"
                    download="abah_chat_python.zip"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 shrink-0 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Bundle</span>
                  </a>
                </div>
              </div>

              {/* Option 1: Native APK Build */}
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Method A: Build Native Android APK (Buildozer Pipeline)</span>
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard('chmod +x build_apk.sh && ./build_apk.sh', 'apk_build')
                    }
                    className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'apk_build' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedKey === 'apk_build' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="bg-black/80 rounded-lg p-3 font-mono text-xs text-emerald-400 border border-zinc-800 flex items-center justify-between">
                  <code>chmod +x build_apk.sh &amp;&amp; ./build_apk.sh</code>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Uses the included <code className="text-zinc-300">buildozer.spec</code> and <code className="text-zinc-300">python_app/android_kivy.py</code> to package the native touch UI with permissions into a standalone <code className="text-zinc-300">.apk</code>.
                </p>
                <div className="bg-zinc-900/80 rounded-lg p-2.5 text-[11px] text-zinc-400 font-mono">
                  # To install on connected Android device via ADB:
                  <br />
                  <span className="text-indigo-300">adb install -r bin/abahchat-1.0.0-arm64-v8a-debug.apk</span>
                </div>
              </div>

              {/* Option 2: Run via Termux on Android phone */}
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Method B: Run Directly on Phone via Termux (Instant)</span>
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        'pkg install python git -y && chmod +x android_run.sh && ./android_run.sh',
                        'termux_run'
                      )
                    }
                    className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'termux_run' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedKey === 'termux_run' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="bg-black/80 rounded-lg p-3 font-mono text-xs text-indigo-300 border border-zinc-800">
                  <code>pkg install python git -y &amp;&amp; chmod +x android_run.sh &amp;&amp; ./android_run.sh</code>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Runs the companion server on your Android phone and automatically pops open the mobile touch interface in Chrome or your default Android browser!
                </p>
              </div>

              {/* Option 3: Remote Ollama connection */}
              <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-xl p-3 text-xs text-zinc-400 space-y-1">
                <div className="font-semibold text-zinc-200">
                  Tip: Connecting Android to your desktop Ollama server
                </div>
                <p className="text-[11px]">
                  When running on Android, set <code className="text-zinc-300">OLLAMA_BASE_URL=http://&lt;your-pc-lan-ip&gt;:11434</code> to let your phone communicate with your desktop GPU for heavy models!
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: PYTHON SOURCE CODE VIEWER */}
          {activeTab === 'code' && (
            <div className="flex flex-col md:flex-row gap-4 h-[480px]">
              {/* File list sidebar */}
              <div className="w-full md:w-60 bg-zinc-950 border border-zinc-800 rounded-xl p-2 space-y-1 overflow-y-auto shrink-0">
                <div className="px-2 py-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Python Modules &amp; Scripts
                </div>
                {files.map((file) => {
                  const isSelected = selectedFile?.path === file.path;
                  return (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-medium shadow-sm'
                          : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileCode className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <span className="truncate font-mono">{file.name}</span>
                      </div>
                      <span className="text-[10px] opacity-75 shrink-0 ml-1">
                        {(file.size / 1024).toFixed(1)}k
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* File contents viewer */}
              <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col overflow-hidden">
                <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-zinc-200 font-semibold">
                      {selectedFile?.path || 'Select a file'}
                    </span>
                    {selectedFile && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                        {selectedFile.category}
                      </span>
                    )}
                  </div>

                  {selectedFile && (
                    <button
                      onClick={() => copyToClipboard(selectedFile.content, 'code_viewer')}
                      className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-750 transition-colors"
                    >
                      {copiedKey === 'code_viewer' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === 'code_viewer' ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-auto p-4 bg-black/90">
                  <pre className="font-mono text-xs text-zinc-300 leading-relaxed selection:bg-indigo-900">
                    {selectedFile?.content || 'No file content'}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>
              Includes <code className="text-zinc-300 font-mono">buildozer.spec</code>, <code className="text-zinc-300 font-mono">.desktop</code>, and 1-click install scripts.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              id="download-python-zip-footer-btn"
              href="/abah_chat_python.zip"
              download="abah_chat_python.zip"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-600/20"
            >
              <Download className="w-4 h-4" />
              <span>Download Python App (.zip)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
