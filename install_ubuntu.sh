#!/bin/bash
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_FILE="$HOME/.local/share/applications/abah-chat.desktop"
ICON_DIR="$HOME/.local/share/icons/hicolor/scalable/apps"

echo "=========================================================="
echo "  Installing ABAH CHAT on Ubuntu Linux Desktop"
echo "=========================================================="

# Check Python 3
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is required. Installing python3..."
    sudo apt update && sudo apt install -y python3
fi

# Make scripts executable
chmod +x "$APP_DIR/run_ubuntu.sh"
chmod +x "$APP_DIR/python_app/main.py"
chmod +x "$APP_DIR/install_ubuntu.sh"

# Install desktop entry
mkdir -p "$HOME/.local/share/applications"
mkdir -p "$ICON_DIR"

cat <<EOF > "$DESKTOP_FILE"
[Desktop Entry]
Version=1.0
Type=Application
Name=ABAH CHAT
GenericName=AI Companion & Ollama Hub
Comment=Personal Loyal Companion with Persistent Memory and Live Ollama Library
Path=$APP_DIR
Exec=python3 "$APP_DIR/python_app/main.py"
Icon=dialog-information
Terminal=false
Categories=Utility;Development;ArtificialIntelligence;Network;
Keywords=Ollama;AI;Chat;LLM;Gemma;Llama;DeepSeek;
StartupNotify=true
Actions=CLI;

[Desktop Action CLI]
Name=Open in Terminal (CLI Mode)
Exec=gnome-terminal -- bash -c "python3 '$APP_DIR/python_app/main.py' --cli; exec bash"
EOF

chmod +x "$DESKTOP_FILE"

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$HOME/.local/share/applications"
fi

echo "=========================================================="
echo "✓ ABAH CHAT successfully installed on Ubuntu!"
echo "• You can launch it from Ubuntu App Grid/Search as 'ABAH CHAT'"
echo "• Or run directly: ./run_ubuntu.sh"
echo "• Or launch CLI: ./run_ubuntu.sh --cli"
echo "=========================================================="
