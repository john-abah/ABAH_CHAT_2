#!/bin/bash
set -e

echo "=========================================================="
echo "  Building ABAH CHAT Debian Package (.deb) for Ubuntu"
echo "=========================================================="

PACKAGE_NAME="abah-chat"
VERSION="1.0.0"
ARCH="all"
BUILD_DIR="/tmp/abah-chat-deb-build"
DEB_NAME="${PACKAGE_NAME}_${VERSION}_${ARCH}.deb"
OUTPUT_DIR="$(pwd)/public/downloads"

mkdir -p "$OUTPUT_DIR"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo "1. Creating package directories..."
mkdir -p "$BUILD_DIR/DEBIAN"
mkdir -p "$BUILD_DIR/usr/bin"
mkdir -p "$BUILD_DIR/usr/share/applications"
mkdir -p "$BUILD_DIR/usr/share/icons/hicolor/scalable/apps"
mkdir -p "$BUILD_DIR/usr/share/abah-chat"
mkdir -p "$BUILD_DIR/usr/share/doc/abah-chat"

echo "2. Generating DEBIAN/control file..."
cat << 'EOF' > "$BUILD_DIR/DEBIAN/control"
Package: abah-chat
Version: 1.0.0
Section: utils
Priority: optional
Architecture: all
Depends: python3 (>= 3.8), python3-pip
Recommends: curl, ollama
Maintainer: ABAH CHAT Team <john.abah246@gmail.com>
Homepage: https://github.com/abah-chat
Description: ABAH CHAT - Personal Loyal Companion & Ollama Model Hub
 ABAH CHAT is a persistent memory personal AI assistant and Ollama model hub.
 Features include:
  * Persistent memory across conversations and restarts
  * Live Ollama model library with one-click download & size selection
  * Support for Gemma 2, Llama 3, DeepSeek-R1, Qwen 2.5, and more
  * Interactive CLI and GUI desktop companion modes
  * Offline-ready local companion
EOF

echo "3. Generating post-installation and pre-removal scripts..."
cat << 'EOF' > "$BUILD_DIR/DEBIAN/postinst"
#!/bin/sh
set -e
chmod +x /usr/bin/abah-chat
chmod +x /usr/bin/abah-chat-cli
chmod +x /usr/share/abah-chat/run_ubuntu.sh
chmod +x /usr/share/abah-chat/python_app/main.py

# Update desktop application database
if command -v update-desktop-database > /dev/null 2>&1; then
    update-desktop-database /usr/share/applications || true
fi

# Update icon cache
if command -v gtk-update-icon-cache > /dev/null 2>&1; then
    gtk-update-icon-cache -f -t /usr/share/icons/hicolor || true
fi

echo "✓ ABAH CHAT installed successfully!"
echo "Type 'abah-chat' in terminal or launch from Ubuntu Application menu."
exit 0
EOF
chmod 755 "$BUILD_DIR/DEBIAN/postinst"

cat << 'EOF' > "$BUILD_DIR/DEBIAN/prerm"
#!/bin/sh
set -e
if command -v update-desktop-database > /dev/null 2>&1; then
    update-desktop-database /usr/share/applications || true
fi
exit 0
EOF
chmod 755 "$BUILD_DIR/DEBIAN/prerm"

echo "4. Copying application files to /usr/share/abah-chat/..."
cp -r python_app "$BUILD_DIR/usr/share/abah-chat/"
cp run_ubuntu.sh "$BUILD_DIR/usr/share/abah-chat/"
cp memory.json "$BUILD_DIR/usr/share/abah-chat/"
cp pulled_models.json "$BUILD_DIR/usr/share/abah-chat/"
cp setup.py "$BUILD_DIR/usr/share/abah-chat/"
cp README.md "$BUILD_DIR/usr/share/abah-chat/"
if [ -f LICENSE ]; then
  cp LICENSE "$BUILD_DIR/usr/share/doc/abah-chat/copyright"
fi

echo "5. Installing executable wrapper in /usr/bin/abah-chat..."
cat << 'EOF' > "$BUILD_DIR/usr/bin/abah-chat"
#!/usr/bin/env bash
export ABAH_CHAT_DIR="/usr/share/abah-chat"
cd "$ABAH_CHAT_DIR"
exec python3 /usr/share/abah-chat/python_app/main.py "$@"
EOF
chmod 755 "$BUILD_DIR/usr/bin/abah-chat"

cat << 'EOF' > "$BUILD_DIR/usr/bin/abah-chat-cli"
#!/usr/bin/env bash
export ABAH_CHAT_DIR="/usr/share/abah-chat"
cd "$ABAH_CHAT_DIR"
exec python3 /usr/share/abah-chat/python_app/main.py --cli "$@"
EOF
chmod 755 "$BUILD_DIR/usr/bin/abah-chat-cli"

echo "6. Installing desktop entry and icon..."
cat << 'EOF' > "$BUILD_DIR/usr/share/applications/abah-chat.desktop"
[Desktop Entry]
Version=1.0
Type=Application
Name=ABAH CHAT
GenericName=AI Companion & Ollama Hub
Comment=Personal Loyal Companion with Persistent Memory and Live Ollama Library
Exec=/usr/bin/abah-chat
Icon=abah-chat
Terminal=false
Categories=Utility;Development;ArtificialIntelligence;Network;
Keywords=Ollama;AI;Chat;LLM;Gemma;Llama;DeepSeek;Qwen;
StartupNotify=true
Actions=CLI;

[Desktop Action CLI]
Name=Open in Terminal (CLI Mode)
Exec=gnome-terminal -- /usr/bin/abah-chat-cli
EOF
chmod 644 "$BUILD_DIR/usr/share/applications/abah-chat.desktop"

# Create SVG Icon
cat << 'EOF' > "$BUILD_DIR/usr/share/icons/hicolor/scalable/apps/abah-chat.svg"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#9333ea" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#bg)" />
  <rect x="24" y="32" width="80" height="60" rx="16" fill="#18181b" stroke="#38bdf8" stroke-width="4" />
  <circle cx="48" cy="58" r="8" fill="url(#accent)" />
  <circle cx="80" cy="58" r="8" fill="url(#accent)" />
  <path d="M 52 74 Q 64 82 76 74" stroke="#f43f5e" stroke-width="4" stroke-linecap="round" fill="none" />
  <rect x="61" y="16" width="6" height="16" rx="3" fill="#38bdf8" />
  <circle cx="64" cy="14" r="5" fill="#facc15" />
</svg>
EOF

echo "7. Packaging .deb with dpkg-deb..."
dpkg-deb --build --root-owner-group "$BUILD_DIR" "$OUTPUT_DIR/$DEB_NAME"
cp "$OUTPUT_DIR/$DEB_NAME" "./$DEB_NAME"

echo "=========================================================="
echo "✓ Successfully built Ubuntu .deb package!"
echo "Location: $OUTPUT_DIR/$DEB_NAME"
echo "To install on Ubuntu Linux:"
echo "  sudo dpkg -i $DEB_NAME"
echo "  sudo apt-get install -f  # (to resolve any dependencies)"
echo "=========================================================="
