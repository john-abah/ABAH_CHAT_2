# 💬 abah_chat — Persistent Memory Local Chatbot

A local-first conversational AI tool featuring persistent memory. Return to your chat history at any time or seamlessly switch models while retaining full context of your previous conversations.

---

## 📖 Table of Contents
- [Overview](#-overview)
- [Key Features](#-key-features)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Usage](#-usage)
- [Switching Models](#-switching-models)
- [Credits](#-credits)
- [Contacts](#-contacts)
- [Buy Me a Coffee](#-buy-me-a-coffee)

---

## 📌 Overview

**abah_chat** is designed to eliminate session loss during local LLM interactions. It stores conversation histories across sessions in persistent storage, allowing you to:
- Resume conversations exactly where you left off.
- Switch between different local models without losing chat context.
- Query the LLM about past discussions and saved history.

---

## ✨ Key Features

- **Persistent Chat History:** Conversations are saved locally across restarts.
- **Model Interoperability:** Swap the underlying LLM at any point and continue referencing prior context.
- **Context Querying:** Prompt the LLM directly to summarize or recall where you left off in past sessions.
- **100% Local & Private:** Powered locally through Ollama.

---

## ⚙️ Prerequisites

- **Python:** `3.12.13` (or Python `3.12+`)
- **Ollama:** Installed and running locally

---

## 📥 Installation

1. **Clone the repository and navigate to the project root:**
   ```bash
   git clone https://github.com/john-abah/ABAH_CHAT.git
   cd ABAH_CHAT
   ```

2. **Install the package in editable mode:**
   ```bash
   pip install -e .
   ```

3. **Pull the model in Ollama:**
   ```bash
   ollama pull gemma4:12b
   ```

---

## 🚀 Usage

1. **Start the Ollama background service:**
   ```bash
   ollama serve
   ```

2. **Launch the chat assistant in your CLI:**
   ```bash
   abah_chat
   ```

3. **Interact with the assistant:**
   - Type your messages normally to chat.
   - Ask contextual questions such as *"Where did we leave off last time?"* or *"Summarize our previous conversation"*.

---

## 🔄 Switching Models

If you wish to use a different model pulled from Ollama:
1. Pull your desired model:
   ```bash
   ollama pull <your-model-name>
   ```
2. Open `abahchat.py` and update:
   - `self.model_client` to your new model name.
   - `model_info` to match the specifications of the newly pulled model.
3. If the program is currently running, exit the session and run `abah_chat` again for the changes to take effect.

---

## 👥 Credits

- **Author:** John Abah

---

## 📬 Contacts

- **Email:** [john.abah@stud.hshl.de](mailto:john.abah@stud.hshl.de)
- **LinkedIn:** [John Abah](https://www.linkedin.com/in/john-abah-311ab233a/)

---

## ☕ Buy Me a Coffee

If you found this project helpful, feel free to support the development:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/johnabah)
