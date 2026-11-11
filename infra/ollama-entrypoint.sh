#!/bin/sh
# Start Ollama, pre-pull the judge model once, then serve.
set -eu
ollama serve & 
SERVER_PID=$!
for _ in $(seq 1 60); do
  ollama list >/dev/null 2>&1 && break
  sleep 2
done
ollama pull "${JUDGE_MODEL:-gemma3:4b}"
wait "$SERVER_PID"
