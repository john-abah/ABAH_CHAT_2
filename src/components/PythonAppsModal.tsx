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
  PackageCheck,
  Laptop,
} from 'lucide-react';

interface PythonFileItem {
  name: string;
  path: string;
  category: string;
  content: string;
  size: number;
}

interface PackageInfo {
  deb: {
    available: boolean;
    filename: string;
    version: string;
    size: string | null;
    downloadUrl: string;
    installCommand: string;
  };
  apk: {
    available: boolean;
    filename: string;
    version: string;
    size: string | null;
    downloadUrl: string;
    installCommand: string;
  };
}

interface PythonAppsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PythonAppsModal: React.FC<PythonAppsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'packages' | 'ubuntu' | 'android' | 'code'>('packages');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [files, setFiles] = useState<PythonFileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<PythonFileItem | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [pkgInfo, setPkgInfo] = useState<PackageInfo | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
      fetchPackageInfo();
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

  const fetchPackageInfo = async () => {
    try {
      const res = await fetch('/api/downloads/info');
      if (res.ok) {
        const data = await res.json();
        setPkgInfo(data);
      }
    } catch (e) {
      console.error('Failed to load package info', e);
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-emerald-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-inner font-mono font-bold text-base">
              <PackageCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
                  ABAH CHAT &middot; Ubuntu &amp; Android Packages
                </h2>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  .deb &amp; .apk Ready
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Installable Ubuntu Debian Package (.deb), Android APK (.apk), and native companion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Download .deb */}
            <a
              id="download-deb-header-btn"
              href="/api/downloads/deb"
              download="abah-chat_1.0.0_all.deb"
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Download Ubuntu .deb package"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ubuntu .deb</span>
            </a>

            {/* Quick Download .apk */}
            <a
              id="download-apk-header-btn"
              href="/api/downloads/apk"
              download="abah-chat-1.0.0.apk"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Download Android .apk package"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android .apk</span>
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
              id="tab-packages-btn"
              onClick={() => setActiveTab('packages')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'packages'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5 text-indigo-300" />
              <span>Packages (.deb &amp; .apk)</span>
            </button>

            <button
              id="tab-ubuntu-app"
              onClick={() => setActiveTab('ubuntu')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'ubuntu'
                  ? 'bg-amber-600/90 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Laptop className="w-3.5 h-3.5 text-amber-400" />
              <span>Ubuntu Desktop</span>
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
              <span>Android Mobile</span>
            </button>

            <button
              id="tab-python-code"
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'code'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Code className="w-3.5 h-3.5 text-zinc-300" />
              <span>Python Source ({files.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-zinc-400 hidden sm:flex items-center gap-2">
            <span className="text-zinc-500">Standalone &middot; Offline-ready with persistent memory</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 0: INSTALLABLE PACKAGES (.DEB & .APK) */}
          {activeTab === 'packages' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Ubuntu Debian Package Card */}
                <div className="bg-zinc-950/90 border border-amber-500/40 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 ring-1 ring-amber-500/20">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                          <Laptop className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-zinc-100">
                            Ubuntu Debian Package (.deb)
                          </h3>
                          <span className="text-[11px] font-mono text-amber-300">
                            abah-chat_1.0.0_all.deb {pkgInfo?.deb?.size ? `(${pkgInfo.deb.size})` : ''}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                        Built &amp; Ready
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Standard Debian binary package for Ubuntu 20.04, 22.04, 24.04+ and Debian-based distros.
                      Installs system launcher <code className="text-zinc-300">/usr/bin/abah-chat</code>, GNOME desktop entry, scalable vector icon, and offline memory system.
                    </p>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>Installation Command:</span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              'sudo dpkg -i abah-chat_1.0.0_all.deb && sudo apt-get install -f',
                              'deb_cmd'
                            )
                          }
                          className="hover:text-zinc-200 flex items-center gap-1"
                        >
                          {copiedKey === 'deb_cmd' ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>Copy</span>
                        </button>
                      </div>
                      <div className="bg-black/90 rounded-lg p-2.5 font-mono text-xs text-amber-300 border border-zinc-800">
                        <code>sudo dpkg -i abah-chat_1.0.0_all.deb</code>
                      </div>
                    </div>
                  </div>

                  <a
                    id="download-deb-primary-btn"
                    href="/api/downloads/deb"
                    download="abah-chat_1.0.0_all.deb"
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                  >
                    <Download className="w-4 h-4 text-zinc-950" />
                    <span>Download Ubuntu .deb Package</span>
                  </a>
                </div>

                {/* 2. Android APK Package Card */}
                <div className="bg-zinc-950/90 border border-emerald-500/40 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 ring-1 ring-emerald-500/20">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-zinc-100">
                            Android Application (.apk)
                          </h3>
                          <span className="text-[11px] font-mono text-emerald-300">
                            abah-chat-1.0.0.apk {pkgInfo?.apk?.size ? `(${pkgInfo.apk.size})` : ''}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                        Built &amp; Ready
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Signed Android APK package for Android 5.0 to 14+. Includes <code className="text-zinc-300">AndroidManifest.xml</code> with network permissions, launcher activity, Dalvik bytecode, and bundled mobile companion.
                    </p>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>Install via ADB or Phone Browser:</span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              'adb install -r abah-chat-1.0.0.apk',
                              'apk_cmd'
                            )
                          }
                          className="hover:text-zinc-200 flex items-center gap-1"
                        >
                          {copiedKey === 'apk_cmd' ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>Copy</span>
                        </button>
                      </div>
                      <div className="bg-black/90 rounded-lg p-2.5 font-mono text-xs text-emerald-300 border border-zinc-800">
                        <code>adb install -r abah-chat-1.0.0.apk</code>
                      </div>
                    </div>
                  </div>

                  <a
                    id="download-apk-primary-btn"
                    href="/api/downloads/apk"
                    download="abah-chat-1.0.0.apk"
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    <Smartphone className="w-4 h-4 text-zinc-950" />
                    <span>Download Android .apk Package</span>
                  </a>
                </div>
              </div>

              {/* Package Pipeline Scripts Information */}
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span>Build Pipeline Scripts Included</span>
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Both package builders are fully automated and can be rebuilt anytime directly in your workspace:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-black/70 p-2 rounded-lg border border-zinc-800 text-amber-300">
                    ./build_deb.sh &rarr; Rebuilds .deb package
                  </div>
                  <div className="bg-black/70 p-2 rounded-lg border border-zinc-800 text-emerald-300">
                    ./build_apk.sh &rarr; Rebuilds .apk package
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: UBUNTU LINUX APP */}
          {activeTab === 'ubuntu' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                      <span>🐧 Ubuntu Desktop Application</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60 font-mono">
                        .deb + App Launcher
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Written in pure Python with the standard library. Seamlessly integrates with the Ubuntu GNOME Application Grid, system dock, and search.
                    </p>
                  </div>
                  <a
                    href="/api/downloads/deb"
                    download="abah-chat_1.0.0_all.deb"
                    className="px-3 py-1.5 rounded-lg bg-amber-600/90 hover:bg-amber-500 text-white text-xs font-medium flex items-center gap-1.5 shrink-0 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .deb</span>
                  </a>
                </div>
              </div>

              {/* Step 1: 1-Click Install */}
              <div className="bg-zinc-950/60 border border-zinc-800/90 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200">
                    Option A: Install via Debian Package
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        'sudo dpkg -i abah-chat_1.0.0_all.deb',
                        'ub_deb_cmd'
                      )
                    }
                    className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'ub_deb_cmd' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>Copy</span>
                  </button>
                </div>
                <div className="bg-black/80 rounded-lg p-3 font-mono text-xs text-amber-300 border border-zinc-800/80">
                  <code>sudo dpkg -i abah-chat_1.0.0_all.deb</code>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Installs <code className="text-zinc-300">/usr/bin/abah-chat</code> and registers <code className="text-zinc-300">abah-chat.desktop</code>. Press Super (Windows) key and search &quot;ABAH CHAT&quot; to launch.
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
                      Signed installable APK package ready for sideloading or direct phone execution with Termux.
                    </p>
                  </div>
                  <a
                    href="/api/downloads/apk"
                    download="abah-chat-1.0.0.apk"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 shrink-0 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .apk</span>
                  </a>
                </div>
              </div>

              {/* Option 1: Native APK Installation */}
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Method A: Install Signed APK on Phone</span>
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard('adb install -r abah-chat-1.0.0.apk', 'apk_install')
                    }
                    className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    {copiedKey === 'apk_install' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>Copy</span>
                  </button>
                </div>
                <div className="bg-black/80 rounded-lg p-3 font-mono text-xs text-emerald-400 border border-zinc-800">
                  <code>adb install -r abah-chat-1.0.0.apk</code>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Or download directly in your mobile browser and tap to install. Enable &quot;Install unknown apps&quot; in Android Settings if prompted.
                </p>
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
                    <span>Copy</span>
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
                {files.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-colors ${
                      selectedFile?.path === file.path
                        ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                    <span className="truncate">{file.name}</span>
                  </button>
                ))}
              </div>

              {/* File content preview */}
              <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col overflow-hidden">
                {selectedFile ? (
                  <>
                    <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60 text-xs">
                      <span className="font-mono text-zinc-200 font-medium">
                        {selectedFile.path}
                      </span>
                      <button
                        onClick={() => copyToClipboard(selectedFile.content, 'code_preview')}
                        className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                      >
                        {copiedKey === 'code_preview' ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedKey === 'code_preview' ? 'Copied' : 'Copy Code'}</span>
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-zinc-300 overflow-auto flex-1 leading-relaxed">
                      <code>{selectedFile.content}</code>
                    </pre>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-zinc-500">
                    Select a Python file to inspect source code
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
