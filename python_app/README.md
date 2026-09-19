# ABAH CHAT - Python Edition (Ubuntu & Android Apps)

Personal loyal companion with persistent memory and online Ollama models hub.

## 🚀 Quick Run on Ubuntu Linux

ABAH CHAT is written with standard Python 3.8+ and requires **zero external packages** to run out of the box!

### 1. Launch in 1 Step:
```bash
python3 python_app/main.py
```
This automatically starts the companion server on `http://localhost:8080` and opens the desktop interface in your browser.

### 2. Interactive CLI Mode:
```bash
python3 python_app/main.py --cli
```

### 3. Install as Ubuntu Desktop App:
```bash
chmod +x install_ubuntu.sh
./install_ubuntu.sh
```
This registers **ABAH CHAT** in the Ubuntu GNOME launcher / Applications menu with icon and `.desktop` entry.

---

## 📱 Android App Installation

You can run ABAH CHAT on Android in two ways:

### Method A: Build Native Android APK (Buildozer)
Requires Linux/Ubuntu:
```bash
chmod +x build_apk.sh
./build_apk.sh
```
This uses Buildozer to compile `python_app/android_kivy.py` into a native `.apk` package in the `bin/` directory.
Install the APK onto your Android phone:
```bash
adb install -r bin/abahchat-1.0.0-arm64-v8a-debug.apk
```

### Method B: Run Directly on Android via Termux
On your Android phone:
1. Open **Termux** (available via F-Droid or GitHub).
2. Clone or copy the project:
   ```bash
   pkg install python git -y
   git clone <repo-url> abah-chat
   cd abah-chat
   chmod +x android_run.sh
   ./android_run.sh
   ```
3. Termux opens the responsive companion interface in Chrome/Android browser at `http://localhost:8080`.

---

## 🧠 Features & Architecture

- **Ollama Online Library Browser**: Scrapes and searches real-time models directly from `ollama.com/library` (`llama3.2`, `deepseek-r1`, `gemma2`, `qwen2.5`, etc.).
- **1-Click Pulling**: Automatically sends pull requests to your local/remote Ollama instance (`http://localhost:11434`).
- **Persistent Memory Engine**: Reads and saves conversational context in `memory.json` using the AssistantAgentState schema.
- **Cross-Platform**: Desktop (Ubuntu / Linux), Mobile (Android APK & Termux), and Web (Cloud Run / AI Studio).
