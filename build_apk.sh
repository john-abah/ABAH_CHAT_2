#!/bin/bash
set -e

echo "==========================================================="
echo "  ABAH CHAT - Android APK Build Pipeline (Buildozer/Python)"
echo "==========================================================="

# Check Python3 and pip
if ! command -v python3 &> /dev/null; then
    echo "Python3 is required. Please install python3."
    exit 1
fi

echo "1. Checking build dependencies (OpenJDK, Cython, Buildozer)..."
sudo apt-get update || true
sudo apt-get install -y git zip unzip openjdk-17-jdk python3-pip autoconf libtool pkg-config zlib1g-dev libncurses5-dev libncursesw5-dev libtinfo5 cmake libffi-dev libssl-dev || true

echo "2. Installing Python buildozer and cython..."
pip3 install --upgrade buildozer cython virtualenv

echo "3. Building Android APK via Buildozer..."
buildozer android debug

echo "==========================================================="
echo "✓ Android APK built successfully!"
echo "Find your generated APK in the 'bin/' directory:"
ls -lh bin/*.apk 2>/dev/null || echo "Check the bin/ folder for the compiled .apk"
echo "To install directly to an attached Android phone:"
echo "  adb install -r bin/*.apk"
echo "==========================================================="
