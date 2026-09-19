"""
ABAH CHAT - Native Kivy App for Android and Ubuntu Desktop
Touch and mobile-optimized interface with persistent memory and Ollama integration.
Can be built into an Android APK using Buildozer.
"""

import os
import sys

# Ensure parent directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from memory import MemoryManager
from ollama_client import OllamaClient

try:
    from kivy.app import App
    from kivy.uix.boxlayout import BoxLayout
    from kivy.uix.scrollview import ScrollView
    from kivy.uix.label import Label
    from kivy.uix.textinput import TextInput
    from kivy.uix.button import Button
    from kivy.uix.popup import Popup
    from kivy.clock import Clock
    from kivy.core.window import Window
    KIVY_AVAILABLE = True
except ImportError:
    KIVY_AVAILABLE = False


class AbahChatMobile(BoxLayout):
    def __init__(self, **kwargs):
        super().__init__(orientation="vertical", spacing=8, padding=10, **kwargs)
        self.memory_mgr = MemoryManager()
        self.ollama_client = OllamaClient()
        self.active_model = "gemma2:2b"

        # Top Bar
        header = BoxLayout(size_hint_y=None, height=44, spacing=8)
        header.add_widget(Label(
            text="[b]ABAH CHAT[/b] (Android & Ubuntu)",
            markup=True,
            font_size="16sp",
            size_hint_x=0.6,
            halign="left"
        ))
        
        models_btn = Button(text="Models", size_hint_x=0.2, font_size="12sp")
        models_btn.bind(on_press=self.open_models_popup)
        header.add_widget(models_btn)

        clear_btn = Button(text="Reset", size_hint_x=0.2, font_size="12sp")
        clear_btn.bind(on_press=self.clear_memory)
        header.add_widget(clear_btn)
        self.add_widget(header)

        # Active Model display
        self.status_label = Label(
            text=f"Model: {self.active_model} | Persistent Memory Active",
            size_hint_y=None,
            height=24,
            font_size="11sp",
            color=(0.7, 0.7, 0.8, 1)
        )
        self.add_widget(self.status_label)

        # Chat Scroll View
        self.scroll = ScrollView(size_hint=(1, 1), do_scroll_x=False)
        self.chat_layout = BoxLayout(orientation="vertical", size_hint_y=None, spacing=8, padding=6)
        self.chat_layout.bind(minimum_height=self.chat_layout.setter('height'))
        self.scroll.add_widget(self.chat_layout)
        self.add_widget(self.scroll)

        # Bottom Input Bar
        input_box = BoxLayout(size_hint_y=None, height=50, spacing=8)
        self.text_input = TextInput(
            hint_text="Type a message to ABAH_CHAT...",
            multiline=False,
            size_hint_x=0.8,
            font_size="14sp"
        )
        self.text_input.bind(on_text_validate=self.send_message)
        input_box.add_widget(self.text_input)

        send_btn = Button(text="Send", size_hint_x=0.2, font_size="14sp", background_color=(0.38, 0.4, 0.94, 1))
        send_btn.bind(on_press=self.send_message)
        input_box.add_widget(send_btn)
        self.add_widget(input_box)

        # Load existing messages
        Clock.schedule_once(lambda dt: self.refresh_messages(), 0.1)

    def refresh_messages(self):
        self.chat_layout.clear_widgets()
        messages = self.memory_mgr.get_messages()
        if not messages:
            self.add_bubble("ABAH_CHAT: Hello! I am your personal companion chatter. How can I help you today?", is_user=False)
            return

        for m in messages:
            is_user = m.get("source") == "user"
            prefix = "You: " if is_user else f"ABAH ({self.active_model}): "
            self.add_bubble(prefix + m.get("content", ""), is_user=is_user)

    def add_bubble(self, text: str, is_user: bool = False):
        lbl = Label(
            text=text,
            size_hint_y=None,
            font_size="13sp",
            halign="left" if not is_user else "right",
            color=(0.9, 0.9, 1.0, 1) if not is_user else (1, 1, 1, 1)
        )
        lbl.bind(width=lambda *x: lbl.setter('text_size')(lbl, (lbl.width, None)))
        lbl.bind(texture_size=lambda *x: lbl.setter('height')(lbl, lbl.texture_size[1] + 12))
        self.chat_layout.add_widget(lbl)
        self.scroll.scroll_to(lbl)

    def send_message(self, *args):
        text = self.text_input.text.strip()
        if not text:
            return
        self.text_input.text = ""
        self.add_bubble(f"You: {text}", is_user=True)
        self.memory_mgr.append_message(text, source="user")

        # Async query
        import threading
        def worker():
            res = self.ollama_client.chat(self.memory_mgr.get_messages(), model=self.active_model)
            reply = res.get("reply", "")
            self.memory_mgr.append_message(reply, source="chatter")
            Clock.schedule_once(lambda dt: self.add_bubble(f"ABAH ({self.active_model}): {reply}", is_user=False), 0)

        threading.Thread(target=worker, daemon=True).start()

    def clear_memory(self, *args):
        self.memory_mgr.clear()
        self.refresh_messages()

    def open_models_popup(self, *args):
        box = BoxLayout(orientation="vertical", spacing=8, padding=10)
        box.add_widget(Label(text="Select or Pull Model:", size_hint_y=None, height=30))
        
        for m in ["gemma2:2b", "llama3.2:1b", "deepseek-r1:1.5b", "qwen2.5:0.5b"]:
            btn = Button(text=m, size_hint_y=None, height=40)
            btn.bind(on_press=lambda inst, name=m: self.set_model(name, popup))
            box.add_widget(btn)

        popup = Popup(title="Ollama Models Hub", content=box, size_hint=(0.85, 0.6))
        popup.open()

    def set_model(self, model_name: str, popup):
        self.active_model = model_name
        self.status_label.text = f"Model: {self.active_model} | Persistent Memory Active"
        popup.dismiss()


class AbahChatApp(App):
    def build(self):
        self.title = "ABAH CHAT - Personal Companion"
        return AbahChatMobile()


if __name__ == "__main__":
    if KIVY_AVAILABLE:
        AbahChatApp().run()
    else:
        print("Kivy is not installed. To run the native Android/Ubuntu GUI, run: pip install kivy")
        print("Starting unified webview/CLI version instead...")
        from main import main
        main()
