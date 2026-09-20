#!/bin/bash
set -e

echo "==========================================================="
echo "  ABAH CHAT - Android APK Build Pipeline"
echo "==========================================================="

if command -v python3 &> /dev/null; then
    echo "Running Python APK Packager..."
    python3 build_apk.py
    echo "==========================================================="
    echo "✓ Android APK ready at public/downloads/abah-chat-1.0.0.apk"
    echo "Root copy at abah-chat-1.0.0.apk"
    echo "==========================================================="
    exit 0
fi

echo "Python 3 is required to package the APK."
exit 1
