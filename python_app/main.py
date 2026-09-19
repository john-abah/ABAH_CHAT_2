#!/usr/bin/env python3
"""
ABAH CHAT - Personal Loyal Companion & Ollama Model Hub
Unified Python application for Ubuntu Linux, Android, and Desktop.

Usage:
  python3 main.py             # Start native local companion app (opens in browser / webview)
  python3 main.py --cli       # Start terminal companion chatter
  python3 main.py --port 8080 # Custom port
  python3 main.py --host 0.0.0.0 # Listen on all interfaces (for Android LAN connection)
"""

import sys
import os
import json
import argparse
import webbrowser
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from memory import MemoryManager
from ollama_client import OllamaClient

memory_mgr = MemoryManager()
ollama_client = OllamaClient()

HTML_PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>ABAH CHAT - Python Edition (Ubuntu & Android)</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236366f1'><path d='M12 2a2 2 0 0 1 2 2v1h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4V4a2 2 0 0 1 2-2z'/></svg>">
  <style>
    :root {
      --bg: #09090b;
      --card: #18181b;
      --border: #27272a;
      --text: #f4f4f5;
      --text-muted: #a1a1aa;
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --emerald: #10b981;
      --amber: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    header { background: #121215; border-bottom: 1px solid var(--border); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #6366f1, #9333ea); display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 18px; box-shadow: 0 4px 12px rgba(99,102,241,0.25); }
    .badge { font-size: 10px; padding: 2px 8px; border-radius: 9999px; background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }
    .controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    button { background: #27272a; border: 1px solid #3f3f46; color: #e4e4e7; padding: 6px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s; }
    button:hover { background: #3f3f46; color: #fff; }
    button.primary { background: var(--primary); border-color: var(--primary); color: white; }
    button.primary:hover { background: var(--primary-hover); }
    button.danger:hover { background: #7f1d1d; border-color: #991b1b; color: #fecaca; }
    #chat-container { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 14px; max-width: 900px; margin: 0 auto; width: 100%; }
    .msg { max-width: 82%; padding: 10px 14px; border-radius: 12px; font-size: 13.5px; line-height: 1.5; word-break: break-word; }
    .msg.user { align-self: flex-end; background: var(--primary); color: white; border-bottom-right-radius: 2px; }
    .msg.assistant { align-self: flex-start; background: #1f1f23; border: 1px solid var(--border); border-bottom-left-radius: 2px; }
    .msg-header { font-size: 10px; opacity: 0.7; margin-bottom: 4px; display: flex; justify-content: space-between; }
    #input-area { background: #121215; border-top: 1px solid var(--border); padding: 12px 16px; }
    .input-wrapper { max-width: 900px; margin: 0 auto; display: flex; gap: 8px; }
    input[type="text"] { flex: 1; background: #18181b; border: 1px solid #3f3f46; border-radius: 10px; padding: 10px 14px; color: white; font-size: 14px; outline: none; }
    input[type="text"]:focus { border-color: var(--primary); ring: 1px solid var(--primary); }
    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; z-index: 100; padding: 16px; }
    .modal { background: #18181b; border: 1px solid var(--border); border-radius: 14px; width: 100%; max-width: 800px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .modal-header { padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
    .modal-body { padding: 16px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 12px; }
    .model-card { background: #121215; border: 1px solid var(--border); border-radius: 10px; padding: 12px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .model-card:hover { border-color: #52525b; }
    .model-meta { display: flex; gap: 6px; margin-top: 4px; font-size: 11px; color: var(--text-muted); }
    .tag { background: #27272a; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-icon">A</div>
      <div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <h1 style="font-size: 15px; font-weight: 600;">ABAH CHAT</h1>
          <span class="badge">Python &middot; Ubuntu & Android</span>
        </div>
        <div style="font-size: 11px; color: var(--text-muted);">
          Active: <strong id="active-model-display" style="color: #c7d2fe; font-family: monospace;">gemma2:2b</strong>
        </div>
      </div>
    </div>
    <div class="controls">
      <button onclick="openModelPicker()">Browse Ollama Models</button>
      <button onclick="toggleMemory()">Memory (<span id="msg-count">0</span>)</button>
      <button class="danger" onclick="clearMemory()">Reset</button>
    </div>
  </header>

  <div id="chat-container">
    <div class="msg assistant">
      <div class="msg-header"><span>ABAH_CHAT (Python)</span></div>
      <div>Hello! I am your personal companion chatter running natively via Python. Persistent memory is active. How can I accompany you today?</div>
    </div>
  </div>

  <div id="input-area">
    <div class="input-wrapper">
      <input type="text" id="user-input" placeholder="Type a message to ABAH_CHAT..." onkeydown="if(event.key==='Enter') sendMsg()">
      <button class="primary" id="send-btn" onclick="sendMsg()">Send</button>
    </div>
  </div>

  <!-- Models Modal -->
  <div id="model-modal" class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <h3 style="font-size: 15px;">Ollama Models (Online & Pulled)</h3>
        <button onclick="closeModal('model-modal')">&times;</button>
      </div>
      <div style="padding: 10px 16px; border-bottom: 1px solid var(--border); display: flex; gap: 8px;">
        <input type="text" id="model-search" placeholder="Search models (llama3, deepseek, gemma...)" oninput="filterModels()">
        <button onclick="fetchOnlineModels()">Search</button>
      </div>
      <div class="modal-body" id="models-list">
        <div style="text-align: center; color: var(--text-muted); padding: 20px;">Loading models...</div>
      </div>
    </div>
  </div>

  <!-- Memory Modal -->
  <div id="memory-modal" class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <h3 style="font-size: 15px;">Persistent Memory (memory.json)</h3>
        <button onclick="closeModal('memory-modal')">&times;</button>
      </div>
      <div class="modal-body">
        <pre id="memory-json" style="font-family: monospace; font-size: 11px; background: #09090b; padding: 12px; border-radius: 8px; overflow-x: auto; color: #a1a1aa;"></pre>
      </div>
    </div>
  </div>

  <script>
    let activeModel = localStorage.getItem('abah_model') || 'gemma2:2b';
    document.getElementById('active-model-display').innerText = activeModel;
    let allModels = [];

    async function loadMessages() {
      try {
        const res = await fetch('/api/memory');
        const data = await res.json();
        const msgs = data.llm_context?.messages || [];
        document.getElementById('msg-count').innerText = msgs.length;
        const container = document.getElementById('chat-container');
        if (msgs.length > 0) {
          container.innerHTML = '';
          msgs.forEach(m => {
            const isUser = m.source === 'user';
            const div = document.createElement('div');
            div.className = 'msg ' + (isUser ? 'user' : 'assistant');
            div.innerHTML = `
              <div class="msg-header">
                <span>${isUser ? 'You' : 'ABAH_CHAT (' + activeModel + ')'}</span>
                <span>${m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
              </div>
              <div>${escapeHtml(m.content)}</div>
            `;
            container.appendChild(div);
          });
          container.scrollTop = container.scrollHeight;
        }
      } catch (e) {
        console.error(e);
      }
    }

    async function sendMsg() {
      const input = document.getElementById('user-input');
      const text = input.value.trim();
      if (!text) return;
      input.value = '';

      // Optimistic append
      const container = document.getElementById('chat-container');
      const userDiv = document.createElement('div');
      userDiv.className = 'msg user';
      userDiv.innerHTML = `<div class="msg-header"><span>You</span></div><div>${escapeHtml(text)}</div>`;
      container.appendChild(userDiv);
      container.scrollTop = container.scrollHeight;

      // Loading bubble
      const loadDiv = document.createElement('div');
      loadDiv.className = 'msg assistant';
      loadDiv.id = 'loading-msg';
      loadDiv.innerHTML = `<div><em>ABAH_CHAT is thinking...</em></div>`;
      container.appendChild(loadDiv);
      container.scrollTop = container.scrollHeight;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ message: text, model: activeModel })
        });
        const data = await res.json();
        loadDiv.remove();
        loadMessages();
      } catch (err) {
        loadDiv.innerHTML = `<div style="color:#f87171;">Error: Failed to connect to Python backend</div>`;
      }
    }

    async function clearMemory() {
      if (!confirm('Clear all conversation history from memory.json?')) return;
      await fetch('/api/memory/clear', { method: 'POST' });
      loadMessages();
    }

    async function openModelPicker() {
      document.getElementById('model-modal').style.display = 'flex';
      fetchOnlineModels();
    }

    async function fetchOnlineModels() {
      const query = document.getElementById('model-search').value;
      const list = document.getElementById('models-list');
      list.innerHTML = '<div style="text-align: center; color: #a1a1aa; padding: 20px;">Fetching models from Ollama...</div>';
      try {
        const res = await fetch('/api/models?q=' + encodeURIComponent(query));
        const data = await res.json();
        allModels = data.models || [];
        renderModels(allModels);
      } catch (e) {
        list.innerHTML = '<div style="color: #f87171; text-align: center;">Failed to load models.</div>';
      }
    }

    function renderModels(models) {
      const list = document.getElementById('models-list');
      if (!models.length) {
        list.innerHTML = '<div style="text-align: center; color: #a1a1aa; padding: 20px;">No models found</div>';
        return;
      }
      list.innerHTML = models.map(m => `
        <div class="model-card">
          <div>
            <div style="font-weight: 600; font-size: 13px;">${m.name} <span class="tag">${m.id}</span></div>
            <div style="font-size: 12px; color: #a1a1aa; margin-top: 2px;">${m.description || ''}</div>
            <div class="model-meta">
              <span>Sizes: ${(m.parameters || ['latest']).join(', ')}</span>
              <span>&middot;</span>
              <span>Pulls: ${m.pulls || 'Popular'}</span>
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="primary" onclick="selectModel('${m.id}')">Select</button>
            <button onclick="pullModel('${m.id}')">Pull</button>
          </div>
        </div>
      `).join('');
    }

    function filterModels() {
      const q = document.getElementById('model-search').value.toLowerCase();
      const filtered = allModels.filter(m => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
      renderModels(filtered);
    }

    function selectModel(id) {
      activeModel = id;
      localStorage.setItem('abah_model', id);
      document.getElementById('active-model-display').innerText = id;
      closeModal('model-modal');
      alert(`Switched active chatter model to "${id}"`);
    }

    async function pullModel(id) {
      alert(`Initiating pull for ${id}...`);
      await fetch('/api/pull', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ model: id })
      });
      alert(`Model ${id} pull completed!`);
    }

    async function toggleMemory() {
      const modal = document.getElementById('memory-modal');
      modal.style.display = 'flex';
      const res = await fetch('/api/memory');
      const data = await res.json();
      document.getElementById('memory-json').innerText = JSON.stringify(data, null, 2);
    }

    function closeModal(id) {
      document.getElementById(id).style.display = 'none';
    }

    function escapeHtml(str) {
      return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    loadMessages();
  </script>
</body>
</html>
"""

class ABAHRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        if path == "/" or path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_PAGE.encode("utf-8"))

        elif path == "/api/memory":
            state = memory_mgr.load_state()
            self.send_json(state)

        elif path == "/api/models":
            q = query.get("q", [None])[0]
            models = ollama_client.fetch_online_models(q)
            self.send_json({"models": models, "count": len(models)})

        elif path == "/api/pulled":
            models = ollama_client.get_pulled_models()
            self.send_json({"models": models, "count": len(models)})

        elif path == "/api/status":
            conn = ollama_client.check_connection()
            self.send_json(conn)

        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not Found")

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
        try:
            payload = json.loads(body)
        except:
            payload = {}

        if path == "/api/chat":
            msg = payload.get("message", "")
            model = payload.get("model", "gemma2:2b")
            
            if msg:
                memory_mgr.append_message(msg, source="user")
                
            messages = memory_mgr.get_messages()
            res = ollama_client.chat(messages, model=model)
            
            reply = res.get("reply", "")
            memory_mgr.append_message(reply, source="chatter")

            self.send_json({
                "reply": reply,
                "model": model,
                "memory": memory_mgr.load_state()
            })

        elif path == "/api/pull":
            model = payload.get("model", "")
            tag = payload.get("tag", "latest")
            result = ollama_client.pull_model(model, tag=tag)
            self.send_json({"success": True, "model": result})

        elif path == "/api/memory/clear":
            empty = memory_mgr.clear()
            self.send_json({"success": True, "memory": empty})

        else:
            self.send_response(404)
            self.end_headers()

    def send_json(self, data: any):
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def log_message(self, format, *args):
        # Suppress spammy log output
        pass

def start_cli():
    """Terminal companion mode."""
    print("=" * 60)
    print("  ABAH CHAT - Python Terminal Companion & Ollama Hub")
    print("  Commands:")
    print("    /models       - Browse online Ollama library")
    print("    /pull <model> - Pull an Ollama model")
    print("    /use <model>  - Switch active chatter model")
    print("    /memory       - Show conversation memory")
    print("    /clear        - Reset memory")
    print("    /exit         - Quit")
    print("=" * 60)

    current_model = "gemma2:2b"
    print(f"\n[Active Model]: {current_model}")

    while True:
        try:
            user_input = input("\nYou > ").strip()
            if not user_input:
                continue

            if user_input in ("/exit", "/quit"):
                print("Goodbye!")
                break
            elif user_input == "/models":
                print("\nFetching online models from Ollama...")
                models = ollama_client.fetch_online_models()
                for m in models[:10]:
                    print(f"  • {m['id']} - {m['name']} ({m.get('pulls', '1M')} pulls)")
                print("Tip: use '/pull <model_name>' to pull any model.")
            elif user_input.startswith("/pull "):
                target = user_input.split(" ", 1)[1].strip()
                print(f"Pulling {target}...")
                ollama_client.pull_model(target)
                print(f"✓ Model {target} pulled successfully!")
            elif user_input.startswith("/use "):
                current_model = user_input.split(" ", 1)[1].strip()
                print(f"Switched active model to: {current_model}")
            elif user_input == "/memory":
                msgs = memory_mgr.get_messages()
                print(f"Memory contains {len(msgs)} messages.")
                for m in msgs[-6:]:
                    src = m.get("source")
                    print(f"[{src}]: {m.get('content')[:80]}...")
            elif user_input == "/clear":
                memory_mgr.clear()
                print("Conversation memory cleared.")
            else:
                memory_mgr.append_message(user_input, source="user")
                print("Thinking...", end="\r")
                res = ollama_client.chat(memory_mgr.get_messages(), model=current_model)
                reply = res.get("reply", "")
                memory_mgr.append_message(reply, source="chatter")
                print(f"ABAH_CHAT ({current_model}) > {reply}")
        except (KeyboardInterrupt, EOFError):
            print("\nExiting.")
            break

def main():
    parser = argparse.ArgumentParser(description="ABAH CHAT - Python Companion & Ollama Hub")
    parser.add_argument("--cli", action="store_true", help="Launch interactive CLI companion")
    parser.add_argument("--host", default="127.0.0.1", help="Host address (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8080, help="Port to listen on (default: 8080)")
    parser.add_argument("--no-browser", action="store_true", help="Don't open browser automatically")
    args = parser.parse_args()

    if args.cli:
        start_cli()
        return

    server_address = (args.host, args.port)
    httpd = HTTPServer(server_address, ABAHRequestHandler)
    url = f"http://{args.host}:{args.port}"
    print(f"[ABAH CHAT] Python Server running at {url}")
    print(f"[ABAH CHAT] Persistent memory: {memory_mgr.filepath}")
    print(f"[ABAH CHAT] Ollama host: {ollama_client.base_url}")

    if not args.no_browser and args.host in ("127.0.0.1", "localhost"):
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.server_close()

if __name__ == "__main__":
    main()
