#!/bin/bash

WORKSPACE_PATH="$1"
PORT="${2:-18789}"

echo "Stopping OpenClaw Gateway on port $PORT..."

# Find PID using lsof
PID=$(lsof -nP -iTCP:$PORT -sTCP:LISTEN -t)

if [ -n "$PID" ]; then
  echo "Found process $PID running on port $PORT. Killing..."
  kill -9 $PID
  echo "Stopped."
else
  echo "No process found running on port $PORT."
fi

# Also try pkill as backup for any stray processes
pkill -f "openclaw gateway"
