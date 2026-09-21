# 💬 ABAH_CHAT_2 — Persistent Memory Local Companion & Ollama Hub

[![GitHub Repository](https://img.shields.io/badge/GitHub-ABAH__CHAT__2-181717?style=flat-square&logo=github)](https://github.com/john-abah/ABAH_CHAT_2)
[![Python Version](https://img.shields.io/badge/Python-3.8%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Node Version](https://img.shields.io/badge/Node-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Platform Support](https://img.shields.io/badge/Platform-Web%20%7C%20Ubuntu%20%7C%20Android-E95420?style=flat-square&logo=ubuntu&logoColor=white)](https://github.com/john-abah/ABAH_CHAT_2)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=flat-square&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/johnabah)

A local-first, privacy-respecting personal AI companion featuring persistent conversation memory and an integrated live Ollama models hub. Return to your chat history anytime, switch local models on the fly without losing context, and run natively across **Web**, **Ubuntu Linux**, and **Android**.

---

## 📖 Table of Contents
- [Overview](#-overview)
- [What's New in ABAH_CHAT_2](#-whats-new-in-abah_chat_2)
- [Key Features](#-key-features)
- [Architecture & Platforms](#-architecture--platforms)
- [Prerequisites](#-prerequisites)
- [Installation & Quick Start](#-installation--quick-start)
  - [Modern Web Application (React + Express)](#modern-web-application-react--express)
- [Ollama Model Management](#-ollama-model-management)
- [Persistent Memory Engine](#-persistent-memory-engine)
- [Credits & Contacts](#-credits--contacts)
- [Buy Me a Coffee](#-buy-me-a-coffee)

---

## 📌 Overview

**ABAH_CHAT_2** eliminates session and context loss when interacting with local LLMs. Standard local chat interfaces lose conversation memory when the window closes or when switching models. 

**ABAH_CHAT_2** solves this by maintaining a structured, persistent conversation state (`memory.json`). You can freely switch between models (e.g. from `gemma2:2b` to `llama3.2:3b` or `deepseek-r1:1.5b`), restart your machine, or switch devices while preserving full conversational continuity.

---

## 🚀 What's New in ABAH_CHAT_2

- **Live Ollama Models Hub**: Search, filter, and browse the live `ollama.com/library` directly from the interface.
- **1-Click Model Pulling**: Pull models directly from the UI or terminal without manual CLI context switching.
- **Seamless Model Interoperability**: Change the active model during a conversation with zero context wipe.
- **Ubuntu Linux Desktop Integration**: 1-click installer (`install_ubuntu.sh`) creating native `.desktop` launchers in the Ubuntu GNOME Application Grid, dock, and search.
- **Android Mobile Deployment**: 
  - Compiled native Android APK pipeline via Buildozer (`build_apk.sh` and `buildozer.spec`).
  - 1-tap instant run on Android phones via Termux (`android_run.sh`).
- **Zero-Dependency Python Backend**: The standalone Python engine (`python_app/`) runs out-of-the-box on standard Python 3.8+ without mandatory external pip packages.
- **Interactive Memory Inspector**: Inspect, edit, delete individual messages, or clear history with a dedicated drawer and JSON view.
- **Remote & Local Ollama Connectivity**: Point your companion to `localhost:11434` or any LAN/server IP to offload model inference to a desktop GPU while chatting on mobile or laptop.

---

## ✨ Key Features

- **Persistent Memory Engine**: Automatic persistence to `memory.json` following the `AssistantAgentState` v1.0.0 schema.
- **Model Switching Without Data Loss**: Prompt the LLM to summarize past sessions or continue ongoing tasks regardless of which model is currently loaded.
- **Cross-Platform**: Run as a modern web app, a native Ubuntu desktop application, an interactive CLI, or on Android.
- **100% Local & Private**: All chat inference and memory stay strictly on your local machine or self-hosted server.
- **ZIP Export**: Download all Python scripts, launchers, and APK build configurations in a single bundle from the UI.

---

## 🏗 Architecture & Platforms

| Platform | Interface | Engine | Key Features |
| :--- | :--- | :--- | :--- |
| **Web UI** | React 18, Tailwind CSS, Lucide Icons | Node.js Express + TypeScript | Visual model browser, memory inspector, settings modal, streaming responses |
| **Ubuntu Linux** | Desktop Webview or Terminal CLI | Python 3 (Standard Library) | GNOME App Grid `.desktop` integration, 1-click installer, `/models`, `/pull`, `/use` commands |
| **Android Mobile** | Native Touch UI (Kivy) or Mobile Browser | Python 3 / Termux / Buildozer | Native `.apk` package, 1-tap Termux launcher, remote LAN Ollama support |

---

## ⚙️ Prerequisites

- **Ollama**: Installed and running ([ollama.com](https://ollama.com))
  ```bash
  # Linux / macOS
  curl -fsSL https://ollama.com/install.sh | sh
  ollama serve
  ```
- **Node.js** (Optional, for Web UI): Node.js 18+ and npm

---

## 📥 Installation & Quick Start

Clone the repository and navigate to the project directory:

```bash
git clone https://github.com/john-abah/ABAH_CHAT_2.git
cd ABAH_CHAT_2
```

### Modern Web Application (React + Express)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open your browser to `http://localhost:3000`.

3. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

---

## 💾 Persistent Memory Engine

Conversation state is saved to `memory.json` using the standard `AssistantAgentState` structure:

```json
{
  "type": "AssistantAgentState",
  "version": "1.0.0",
  "llm_context": {
    "messages": [
      {
        "content": "Hello! Where did we leave off?",
        "source": "user",
        "type": "UserMessage",
        "timestamp": "2026-09-19T10:00:00.000Z"
      },
      {
        "content": "In our previous session, we were discussing...",
        "source": "chatter",
        "type": "AssistantMessage",
        "timestamp": "2026-09-19T10:00:03.000Z"
      }
    ]
  }
}
```

Use the **Memory** button in the header to view, edit, copy, or reset the memory at any time.

---

## 👥 Credits & Contacts

- **Author:** John Abah
- **Repository:** [https://github.com/john-abah/ABAH_CHAT_2](https://github.com/john-abah/ABAH_CHAT_2)
- **Email:** [john.abah@stud.hshl.de](mailto:john.abah@stud.hshl.de)
- **LinkedIn:** [John Abah](https://www.linkedin.com/in/john-abah-311ab233a/)

---

## ☕ Buy Me a Coffee

If you find **ABAH_CHAT_2** helpful, feel free to support ongoing development:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/johnabah)

