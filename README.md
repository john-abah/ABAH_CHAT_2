# 💬 ABAH CHAT — Persistent Memory AI Companion & Ollama Hub

[![GitHub Repository](https://img.shields.io/badge/GitHub-ABAH__CHAT-181717?style=flat-square&logo=github)](https://github.com/john-abah/ABAH_CHAT_2)
[![Node Version](https://img.shields.io/badge/Node-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React Version](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=flat-square&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/johnabah)

A local-first, privacy-respecting personal AI companion featuring persistent conversation memory and an integrated live Ollama models hub. Return to your chat history anytime, switch local models on the fly without losing context, and interact directly through a sleek modern web interface.

---

## 📖 Table of Contents
- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation & Quick Start](#-installation--quick-start)
- [Ollama Model Hub & Management](#-ollama-model-hub--management)
- [Persistent Memory Engine](#-persistent-memory-engine)
- [Credits & Contacts](#-credits--contacts)
- [Buy Me a Coffee](#-buy-me-a-coffee)

---

## 📌 Overview

Standard local LLM chat interfaces lose context and session state whenever the tab or window closes, or when changing models.

**ABAH CHAT** solves this by maintaining a structured, persistent conversation state (`memory.json`). You can freely switch between models (e.g. from `gemma2:2b` to `llama3.2:3b` or `deepseek-r1:1.5b`), refresh your browser, or restart the server while preserving full conversational continuity.

---

## ✨ Key Features

- **Persistent Memory Engine**: Automatic local persistence to `memory.json` following the `AssistantAgentState` v1.0.0 schema.
- **Live Ollama Models Hub**: Search, filter by category or parameter size (`0.5b`, `1.5b`, `2b`, `3b`, `7b`, `8b`, `14b`, `32b`, `70b+`), and browse the live `ollama.com/library` directly in the web app.
- **1-Click Model Pulling with Progress Tracking**: Pull models directly from the UI with real-time download progress bars and size selection.
- **Model Switching Without Data Loss**: Change the active model during a conversation with zero context loss.
- **Local Pulled Models View**: Inspect all locally installed weights, size on disk, and manage or delete models with one click.
- **Interactive Memory Inspector**: Inspect, edit, copy, and clear conversation history through a dedicated drawer and formatted JSON viewer.
- **Remote & Local Ollama Connectivity**: Point your companion to `localhost:11434` or any LAN/server IP to offload model inference.
- **100% Local & Private**: All chat inference and memory stay strictly on your machine.

---

## 🏗 Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Motion
- **Backend Server**: Node.js, Express, TypeScript (executed via `tsx` in dev, bundled with `esbuild` for production)
- **Local Inference**: Local Ollama daemon (`http://localhost:11434`) or remote host

---

## ⚙️ Prerequisites

- **Node.js**: 18+ and npm
- **Ollama**: Installed and running ([ollama.com](https://ollama.com))
  ```bash
  ollama serve
  ```

---

## 📥 Installation & Quick Start

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

## 🔄 Ollama Model Hub & Management

- **Browse & Filter**: Click **Online Library** in the header to search and browse models by category or parameter size.
- **Pull Models**: Click **Select & Pull** on any uninstalled model. A confirmation dialog will summarize the model before initiating the real-time download.
- **Switch Active Model**: Switch between pulled models instantly from the header or the Pulled Models tab without wiping your chat memory.

---

## 💾 Persistent Memory Engine

Conversation state is saved to `memory.json`:

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

Use the **Memory** button in the header to view, copy, or reset the memory at any time.

---

## 👥 Credits & Contacts

- **Author:** John Abah
- **Repository:** [https://github.com/john-abah/ABAH_CHAT_2](https://github.com/john-abah/ABAH_CHAT_2)
- **Email:** [john.abah246@gmail.com](mailto:john.abah246@gmail.com)
- **LinkedIn:** [John Abah](https://www.linkedin.com/in/john-abah-311ab233a/)

---

## ☕ Buy Me a Coffee

If you find **ABAH CHAT** helpful, feel free to support ongoing development:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/johnabah)
