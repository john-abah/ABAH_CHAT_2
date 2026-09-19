#!/bin/bash
# ABAH CHAT - 1-Click Android Launcher (via Termux)
# Run directly on Android phones or tablets

echo "=== Launching ABAH CHAT on Android ==="
pkg update -y || true
pkg install python git -y || true

# Run the Python companion server listening on localhost
# and open on Android default browser
python3 python_app/main.py --host 0.0.0.0 --port 8080 &
SERVER_PID=$!

sleep 2

# Open on Android browser via termux-open-url if available, or am start
if command -v termux-open-url &> /dev/null; then
    termux-open-url http://localhost:8080
elif command -v am &> /dev/null; then
    am start -a android.intent.action.VIEW -d "http://localhost:8080"
else
    echo "Server running! Open http://localhost:8080 in your Android browser."
fi

wait $SERVER_PID
