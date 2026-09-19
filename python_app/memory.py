import os
import json
from datetime import datetime
from typing import Dict, Any, List

DEFAULT_MEMORY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "memory.json")

class MemoryManager:
    """Manages persistent conversation memory compatible with ABAH_CHAT schema."""
    
    def __init__(self, filepath: str = DEFAULT_MEMORY_FILE):
        self.filepath = filepath
        self._ensure_file()

    def _ensure_file(self):
        if not os.path.exists(self.filepath):
            initial_state = {
                "type": "AssistantAgentState",
                "version": "1.0.0",
                "llm_context": {
                    "messages": []
                }
            }
            self.save_state(initial_state)

    def load_state(self) -> Dict[str, Any]:
        try:
            if os.path.exists(self.filepath):
                with open(self.filepath, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            print(f"[Memory] Error loading memory: {e}")
        return {
            "type": "AssistantAgentState",
            "version": "1.0.0",
            "llm_context": {"messages": []}
        }

    def save_state(self, state: Dict[str, Any]):
        try:
            with open(self.filepath, "w", encoding="utf-8") as f:
                json.dump(state, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[Memory] Error saving memory: {e}")

    def append_message(self, content: str, source: str = "user"):
        state = self.load_state()
        messages = state.get("llm_context", {}).get("messages", [])
        
        msg_type = "UserMessage" if source == "user" else "AssistantMessage"
        new_msg = {
            "content": content,
            "source": source,
            "type": msg_type,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        if source != "user":
            new_msg["thought"] = None

        messages.append(new_msg)
        state["llm_context"]["messages"] = messages
        self.save_state(state)
        return state

    def clear(self):
        empty_state = {
            "type": "AssistantAgentState",
            "version": "1.0.0",
            "llm_context": {"messages": []}
        }
        self.save_state(empty_state)
        return empty_state

    def get_messages(self) -> List[Dict[str, Any]]:
        state = self.load_state()
        return state.get("llm_context", {}).get("messages", [])
