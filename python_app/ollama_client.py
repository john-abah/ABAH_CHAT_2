import os
import re
import json
import urllib.request
import urllib.parse
from datetime import datetime
from typing import List, Dict, Any, Optional, Callable

PULLED_MODELS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pulled_models.json")

DEFAULT_INITIAL_PULLED = [
    {
        "id": "gemma2:2b",
        "name": "Gemma 2 2B",
        "baseModelId": "gemma2",
        "tag": "2b",
        "parameterSize": "2.6B",
        "size": "1.6 GB",
        "description": "Google's ultra-efficient 2B model. Default companion chatter profile.",
        "pulledAt": datetime.utcnow().isoformat() + "Z",
        "status": "ready",
        "progress": 100
    }
]

SYSTEM_PERSONA = (
    "You are a helpful, witty, loyal, and friendly companion chatter named ABAH_CHAT. "
    "You have persistent memory across our conversations. "
    "Be direct, insightful, concise, and conversational. Maintain continuity from past topics."
)

class OllamaClient:
    """Client for Ollama local API and live online ollama.com library."""

    def __init__(self, base_url: Optional[str] = None):
        self.base_url = (base_url or os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")).rstrip("/")
        self._cached_online = None
        self._cache_time = 0

    def check_connection(self) -> Dict[str, Any]:
        """Check if local Ollama daemon is running."""
        try:
            req = urllib.request.Request(f"{self.base_url}/api/tags", headers={"User-Agent": "ABAH-Chat/1.0"})
            with urllib.request.urlopen(req, timeout=2) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                models = data.get("models", [])
                return {
                    "connected": True,
                    "host": self.base_url,
                    "version": resp.headers.get("X-Ollama-Version", "active"),
                    "installedCount": len(models),
                    "installedModels": [m.get("name") for m in models],
                    "error": None
                }
        except Exception as e:
            return {
                "connected": False,
                "host": self.base_url,
                "version": None,
                "installedCount": 0,
                "installedModels": [],
                "error": str(e)
            }

    def fetch_online_models(self, query: Optional[str] = None) -> List[Dict[str, Any]]:
        """Scrape live models from official ollama.com library."""
        is_search = bool(query and query.strip())
        target_url = (
            f"https://ollama.com/search?q={urllib.parse.quote(query.strip())}"
            if is_search
            else "https://ollama.com/library"
        )

        try:
            req = urllib.request.Request(
                target_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml"
                }
            )
            with urllib.request.urlopen(req, timeout=6) as response:
                html = response.read().decode("utf-8")

            # Extract model links and cards
            matches = re.finditer(r'<a[^>]*href="/library/([a-zA-Z0-9._-]+)"[^>]*>([\s\S]*?)</a>', html)
            discovered = []
            seen = set()

            for match in matches:
                model_id = match.group(1)
                if model_id in seen:
                    continue
                seen.add(model_id)

                inner = match.group(2)
                # Description
                desc_match = re.search(r'<p[^>]*class="[^"]*break-words[^"]*"[^>]*>([\s\S]*?)</p>', inner) or \
                             re.search(r'<p[^>]*>([\s\S]*?)</p>', inner)
                description = (
                    re.sub(r'<[^>]+>', '', desc_match.group(1)).replace('&nbsp;', ' ').strip()
                    if desc_match else "Official Ollama model"
                )

                # Parameter tags
                params = [
                    m.strip() for m in re.findall(
                        r'<span[^>]*class="[^"]*rounded-md[^"]*bg-\[#ddf4ff\][^"]*"[^>]*>([^<]+)</span>',
                        inner
                    ) if m.strip() and '&nbsp;' not in m
                ]
                if not params:
                    params = [m.lower() for m in re.findall(r'\b([0-9.]+[bB])\b', inner)[:4]]
                if not params:
                    params = ["latest"]

                # Pulls count
                pulls_match = re.search(r'<span[^>]*>([0-9.]+[KMB]?)</span>\s*<span[^>]*>&nbsp;Pulls</span>', inner) or \
                              re.search(r'([0-9.]+[KMB]?)\s*&nbsp;Pulls', inner)
                pulls = pulls_match.group(1) if pulls_match else "1M+"

                # Capabilities
                capabilities = []
                if "tools" in inner: capabilities.append("tools")
                if "thinking" in inner: capabilities.append("thinking")
                if "vision" in inner: capabilities.append("vision")
                if "embedding" in inner: capabilities.append("embedding")

                discovered.append({
                    "id": model_id,
                    "name": self._format_name(model_id),
                    "description": description,
                    "parameters": params,
                    "capabilities": capabilities,
                    "pulls": pulls,
                    "family": self._infer_family(model_id)
                })

            if discovered:
                return discovered

        except Exception as e:
            print(f"[OllamaClient] Online library scrape error: {e}")

        # Fallback offline list of top models if network is unreachable
        return self._get_fallback_catalog(query)

    def get_pulled_models(self) -> List[Dict[str, Any]]:
        """Get the list of pulled models from local storage and Ollama daemon."""
        pulled = []
        if os.path.exists(PULLED_MODELS_FILE):
            try:
                with open(PULLED_MODELS_FILE, "r", encoding="utf-8") as f:
                    pulled = json.load(f)
            except Exception as e:
                print(f"[OllamaClient] Error reading pulled models: {e}")

        if not pulled:
            pulled = DEFAULT_INITIAL_PULLED.copy()
            self._save_pulled_models(pulled)

        # Merge local models detected directly on Ollama daemon
        conn = self.check_connection()
        if conn["connected"]:
            for name in conn.get("installedModels", []):
                if not any(p["id"].lower() == name.lower() for p in pulled):
                    parts = name.split(":")
                    base = parts[0]
                    tag = parts[1] if len(parts) > 1 else "latest"
                    pulled.append({
                        "id": name,
                        "name": self._format_name(base) + (f" ({tag})" if tag != "latest" else ""),
                        "baseModelId": base,
                        "tag": tag,
                        "parameterSize": tag.upper(),
                        "size": "Local",
                        "description": f"Installed on Ollama server at {self.base_url}",
                        "pulledAt": datetime.utcnow().isoformat() + "Z",
                        "status": "ready",
                        "progress": 100
                    })

        return pulled

    def _save_pulled_models(self, models: List[Dict[str, Any]]):
        try:
            with open(PULLED_MODELS_FILE, "w", encoding="utf-8") as f:
                json.dump(models, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[OllamaClient] Error saving pulled models: {e}")

    def pull_model(self, model_id: str, tag: str = "latest", progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None) -> Dict[str, Any]:
        """Trigger pull for a model from Ollama library."""
        full_tag = f"{model_id}:{tag}" if tag != "latest" and ":" not in model_id else model_id
        base_id = full_tag.split(":")[0]

        pulled = self.get_pulled_models()
        # Record in pulled list
        existing_idx = next((i for i, m in enumerate(pulled) if m["id"].lower() == full_tag.lower()), None)
        entry = {
            "id": full_tag,
            "name": self._format_name(base_id) + (f" ({tag})" if tag != "latest" else ""),
            "baseModelId": base_id,
            "tag": tag,
            "parameterSize": tag.upper(),
            "size": "1.6 GB",
            "description": f"Pulled from Ollama library ({full_tag})",
            "pulledAt": datetime.utcnow().isoformat() + "Z",
            "status": "ready",
            "progress": 100
        }

        if existing_idx is not None:
            pulled[existing_idx] = entry
        else:
            pulled.insert(0, entry)

        conn = self.check_connection()
        if conn["connected"]:
            try:
                req = urllib.request.Request(
                    f"{self.base_url}/api/pull",
                    data=json.dumps({"model": full_tag}).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=120) as resp:
                    for line in resp:
                        if line:
                            try:
                                chunk = json.loads(line.decode("utf-8"))
                                total = chunk.get("total", 0)
                                completed = chunk.get("completed", 0)
                                percent = int((completed / total) * 100) if total > 0 else 50
                                if progress_callback:
                                    progress_callback({
                                        "status": chunk.get("status", "Pulling..."),
                                        "percent": percent
                                    })
                            except:
                                pass
            except Exception as e:
                print(f"[OllamaClient] Direct Ollama pull warning: {e}")

        self._save_pulled_models(pulled)
        return entry

    def delete_model(self, model_id: str) -> bool:
        """Remove a model from pulled list and Ollama."""
        pulled = self.get_pulled_models()
        updated = [m for m in pulled if m["id"].lower() != model_id.lower()]
        self._save_pulled_models(updated)

        conn = self.check_connection()
        if conn["connected"]:
            try:
                req = urllib.request.Request(
                    f"{self.base_url}/api/delete",
                    data=json.dumps({"model": model_id}).encode("utf-8"),
                    headers={"Content-Type": "application/json"},
                    method="DELETE"
                )
                with urllib.request.urlopen(req, timeout=5) as _:
                    pass
            except:
                pass
        return True

    def chat(self, messages: List[Dict[str, Any]], model: str = "gemma2:2b") -> Dict[str, Any]:
        """Send a conversational turn to Ollama, retaining context."""
        conn = self.check_connection()
        if not conn["connected"]:
            # Companion fallback response when Ollama is offline
            last_user_msg = next((m["content"] for m in reversed(messages) if m.get("source") == "user"), "Hello")
            return {
                "reply": (
                    f"Hello! I am ABAH_CHAT running on Python. "
                    f"I received your message: \"{last_user_msg}\". "
                    f"Ollama local daemon is currently offline at {self.base_url}. "
                    f"Please start Ollama with 'ollama serve' or select another pulled model to enable local neural generation!"
                ),
                "model": model,
                "provider": "python_companion_fallback"
            }

        # Build payload for Ollama /api/chat
        formatted_msgs = [{"role": "system", "content": SYSTEM_PERSONA}]
        for m in messages[-10:]:
            role = "user" if m.get("source") == "user" else "assistant"
            formatted_msgs.append({"role": role, "content": m.get("content", "")})

        try:
            payload = json.dumps({
                "model": model,
                "messages": formatted_msgs,
                "stream": False
            }).encode("utf-8")

            req = urllib.request.Request(
                f"{self.base_url}/api/chat",
                data=payload,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                reply = data.get("message", {}).get("content", "").strip()
                return {
                    "reply": reply or "No response returned from model.",
                    "model": model,
                    "provider": f"ollama:{model}"
                }
        except Exception as e:
            return {
                "reply": f"ABAH_CHAT companion error communicating with {model}: {e}",
                "model": model,
                "provider": "error"
            }

    def _format_name(self, slug: str) -> str:
        if slug.lower().startswith("deepseek"):
            return slug.replace("deepseek", "DeepSeek").replace("-r1", "-R1")
        return " ".join([w.capitalize() for w in re.split(r'[-_]', slug)])

    def _infer_family(self, slug: str) -> str:
        s = slug.lower()
        if "gemma" in s: return "gemma"
        if "llama" in s: return "llama"
        if "deepseek" in s: return "deepseek"
        if "qwen" in s: return "qwen"
        if "mistral" in s or "mixtral" in s: return "mistral"
        if "phi" in s: return "phi"
        return "other"

    def _get_fallback_catalog(self, query: Optional[str] = None) -> List[Dict[str, Any]]:
        catalog = [
            {"id": "llama3.2", "name": "Llama 3.2", "description": "Meta's state of the art lightweight models (1B & 3B).", "parameters": ["1b", "3b"], "capabilities": ["tools"], "pulls": "80M+", "family": "llama"},
            {"id": "deepseek-r1", "name": "DeepSeek-R1", "description": "Open reasoning thinking model family with leading benchmark scores.", "parameters": ["1.5b", "7b", "8b", "14b"], "capabilities": ["thinking"], "pulls": "93M+", "family": "deepseek"},
            {"id": "gemma2", "name": "Gemma 2", "description": "Google's ultra-efficient models built on Gemini technology.", "parameters": ["2b", "9b", "27b"], "capabilities": ["tools"], "pulls": "45M+", "family": "gemma"},
            {"id": "qwen2.5", "name": "Qwen 2.5", "description": "Alibaba's powerful multilingual and coding model series.", "parameters": ["0.5b", "1.5b", "7b"], "capabilities": ["tools"], "pulls": "30M+", "family": "qwen"},
            {"id": "mistral", "name": "Mistral 7B", "description": "High performance general purpose European open model.", "parameters": ["7b"], "capabilities": ["tools"], "pulls": "50M+", "family": "mistral"},
            {"id": "phi4", "name": "Phi-4", "description": "Microsoft's 14B state-of-the-art small language model.", "parameters": ["14b"], "capabilities": ["reasoning"], "pulls": "15M+", "family": "phi"}
        ]
        if query:
            q = query.lower()
            return [m for m in catalog if q in m["id"] or q in m["name"].lower() or q in m["description"].lower()]
        return catalog
