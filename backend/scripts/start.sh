#!/bin/bash

WORKSPACE_PATH="$1"
PORT="${2:-18789}"

if [ -z "$WORKSPACE_PATH" ]; then
  echo "Usage: $0 <workspace_path> [port]"
  exit 1
fi

export OPENCLAW_STATE_DIR="$WORKSPACE_PATH"
LOG_FILE="/tmp/openclaw-gateway.log"

# Check if port is already in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "Port $PORT is already in use"
    exit 1
fi

echo "Starting OpenClaw Gateway..."
echo "Workspace: $WORKSPACE_PATH"
echo "Port: $PORT"
echo "Log: $LOG_FILE"

# Run in background and print PID
nohup env OPENCLAW_STATE_DIR="$WORKSPACE_PATH" openclaw gateway run --port "$PORT" --auth none > "$LOG_FILE" 2>&1 &
PID=$!
echo $PID