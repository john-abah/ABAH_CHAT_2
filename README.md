# 💬 ABAH CHAT — Persistent Memory AI Companion & Ollama Hub

[![GitHub Repository](https://img.shields.io/badge/GitHub-ABAH__CHAT-181717?style=flat-square&logo=github)](https://github.com/john-abah/ABAH_CHAT_2)
[![Node Version](https://img.shields.io/badge/Node-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React Version](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=flat-square&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/johnabah)

A private, local-first personal AI companion and Ollama management center. Featuring persistent conversation memory, live Ollama model library browsing, one-click model pulling with real-time download tracking, free real-time internet search grounding, ChatGPT shared conversation ingestion, and multimodal file attachments.

---

## 📖 Table of Contents
- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation & Quick Start](#-installation--quick-start)
- [Ollama Model Hub & Management](#-ollama-model-hub--management)
- [Shared Chat & Transcript Ingestion](#-shared-chat--transcript-ingestion)
- [Live Web Search Grounding](#-live-web-search-grounding)
- [Multimodal File Attachments](#-multimodal-file-attachments)
- [Persistent Memory Engine](#-persistent-memory-engine)
- [API Architecture](#-api-architecture)
- [Credits & Contacts](#-credits--contacts)
- [Buy Me a Coffee](#-buy-me-a-coffee)

---

## 📌 Overview

Traditional local LLM interfaces lose session state when a browser tab closes or when switching between models.

**ABAH CHAT** preserves complete conversational context with structured local persistence (`memory.json`). You can freely switch active models (e.g. from `llama3.2:3b` to `qwen2.5-coder:7b` or `deepseek-r1:1.5b`), reboot the dev server, or reload the page while preserving your conversational history, attachments, and context.

---

## ✨ Key Features

- **🧠 Persistent Memory Engine**: Automatic persistence to `memory.json` complying with the `AssistantAgentState` v1.0.0 schema.
- **🌐 Live Ollama Model Hub**: Browse, search, and filter the live `ollama.com/library` directly inside the app by category or parameter size (`0.5b`, `1.5b`, `2b`, `3b`, `7b`, `8b`, `14b`, `32b`, `70b+`).
- **⚡ 1-Click Model Pulling with Real-Time Progress**: Pull models directly from the UI with live byte-level progress bars and status indicators.
- **🔄 Hot Model Switching**: Switch between locally installed models mid-conversation with zero context loss.
- **🔗 Shared Chat Ingestion**: Paste public OpenAI ChatGPT shared links (`chatgpt.com/share/...`) or paste dialogue transcripts to inspect, quote, infer on, or import them directly into active memory.
- **🔍 Real-Time Web Grounding**: Instant DuckDuckGo search integration that fetches live search results and snippets to ground responses with up-to-date information.
- **📎 Multimodal Attachments**: Drag and drop or upload images (PNG, JPEG, WebP) and PDF documents with automatic text extraction for document QA and vision reasoning.
- **🛠 Interactive Memory Inspector**: Inspect, edit, copy, export, and reset conversation history through a slide-out drawer and formatted JSON viewer.
- **📡 Flexible Connectivity**: Connect to local Ollama (`http://localhost:11434`) or any remote LAN/server endpoint.
- **🔒 100% Local & Privacy-First**: All model inference, documents, and memory remain on your local machine.

---

## 🏗 Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS v4, Lucide Icons, Motion
- **Backend**: Node.js, Express, TypeScript (executed via `tsx` during development, bundled with `esbuild` for production)
- **Local Inference**: Ollama daemon (`http://localhost:11434`) or remote Ollama server
- **Parsers & Utilities**: `pdf-parse` for PDF document extraction, DuckDuckGo search API integration

---

## ⚙️ Prerequisites

- **Node.js**: 18+ and npm
- **Ollama**: Installed and running ([ollama.com](https://ollama.com))
  ```bash
  ollama serve
  ```

---

## 📥 Installation & Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/john-abah/ABAH_CHAT_2.git
   cd ABAH_CHAT_2
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open your browser to `http://localhost:3000`.

---

## 🔄 Ollama Model Hub & Management

- **Browse & Search**: Open the **Online Library** tab in the header to browse popular open-source models (Llama 3, DeepSeek, Qwen, Mistral, Gemma, Phi, and more).
- **Filter by Size**: Quickly filter models by parameter count (`0.5b` up to `70b+`) to match your hardware capabilities.
- **Pull Models**: Click **Select & Pull** on any uninstalled model. View real-time download and extraction progress directly in the interface.
- **Manage Installed Models**: The **Pulled Models** tab lists all locally available weights, their disk size, and provides single-click deletion or active model selection.
- **Custom Endpoint**: Configure your Ollama host URL in settings if running on a remote server or alternate port.

---

## 🔗 Shared Chat & Transcript Ingestion

ABAH CHAT includes a shared chat reader and importer:

- **OpenAI ChatGPT Links**: Paste any public shared conversation link (`https://chatgpt.com/share/...`). The parser extracts turn-by-turn dialogue, title, and metadata.
- **Raw Transcripts & JSON**: Paste raw JSON exports or formatted dialogue transcripts (`[User]: ...`, `[Assistant]: ...`).
- **Inspection & Inference**: Read the extracted conversation, infer or ask questions about it, or merge it into your active memory companion.

---

## 🔍 Live Web Search Grounding

- Toggle **Web Search** on or off directly from the chat input toolbar.
- When enabled, user queries are routed through a real-time DuckDuckGo web search agent.
- Search snippets, page titles, and reference links are synthesized and passed into the model prompt to ground answers with current internet data.

---

## 📎 Multimodal File Attachments

- **Images**: Attach PNG, JPEG, and WebP images. Sent directly to vision-capable local models (e.g. `llava`, `llama3.2-vision`) as base64 payloads.
- **Documents & PDFs**: Upload PDFs or text files. The backend extracts document contents and injects them as reference context for question answering, summarization, and analysis.

---

## 💾 Persistent Memory Engine

Conversation history is automatically persisted to `memory.json` using the structured `AssistantAgentState` schema:

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
        "timestamp": "2026-09-24T10:00:00.000Z"
      },
      {
        "content": "In our previous session, we were discussing...",
        "source": "chatter",
        "type": "AssistantMessage",
        "timestamp": "2026-09-24T10:00:03.000Z"
      }
    ]
  }
}
```

Use the **Memory** inspector button in the top navigation to view the live state, copy the JSON, download a backup, or clear the history.

---

## 📡 API Architecture

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Health check endpoint |
| `/api/ollama/status` | `GET` | Check Ollama connectivity and status |
| `/api/ollama/models` | `GET` | List locally pulled models |
| `/api/ollama/library` | `GET` | Search and list available models from Ollama library |
| `/api/ollama/pull` | `POST` | Pull a model with SSE stream progress |
| `/api/ollama/delete` | `DELETE` | Delete a local model |
| `/api/chat` | `POST` | Send chat prompt to active model with stream support |
| `/api/memory` | `GET` / `POST` / `DELETE` | Retrieve, update, or clear `memory.json` |
| `/api/search` | `POST` | Execute live internet search query |
| `/api/shared-chat/fetch` | `POST` | Parse and extract conversation from shared ChatGPT links |
| `/api/shared-chat/parse-text` | `POST` | Parse raw dialogue transcript or JSON |

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
