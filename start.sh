#!/bin/bash
set -euo pipefail

# =============================================================================
# Zeke AI Startup Script
# Starts llama-server and the FastAPI application
# =============================================================================

ZEKE_HOME="${ZEKE_BASE_DIR:-/workspace/zeke-ai}"
cd "$ZEKE_HOME"

# Load environment
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

source venv/bin/activate

LLM_MODEL="${ZEKE_MODELS_DIR:-$ZEKE_HOME/models}/${ZEKE_LLM_MODEL:-qwen2.5-1.5b-instruct-q4_k_m.gguf}"
LLM_CTX="${ZEKE_LLM_CONTEXT_SIZE:-2048}"
LLM_PARALLEL="${ZEKE_LLM_PARALLEL_SLOTS:-2}"
LLM_THREADS="${ZEKE_LLM_THREADS:-3}"
LLM_HOST="${ZEKE_LLM_HOST:-127.0.0.1}"
LLM_PORT="${ZEKE_LLM_PORT:-8081}"

# --- Start llama-server ---
echo "Starting llama-server..."
"$ZEKE_HOME/llama-server" \
    -m "$LLM_MODEL" \
    -c "$LLM_CTX" \
    --parallel "$LLM_PARALLEL" \
    -t "$LLM_THREADS" \
    --host "$LLM_HOST" \
    --port "$LLM_PORT" \
    --log-disable &
LLAMA_PID=$!
echo "llama-server started (PID: $LLAMA_PID)"

# Wait for llama-server to be ready
echo "Waiting for llama-server..."
for i in $(seq 1 60); do
    if curl -s "http://$LLM_HOST:$LLM_PORT/health" > /dev/null 2>&1; then
        echo "llama-server ready."
        break
    fi
    if [ "$i" -eq 60 ]; then
        echo "ERROR: llama-server did not start within 60 seconds"
        kill $LLAMA_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

# --- Handle shutdown ---
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $LLAMA_PID 2>/dev/null || true
    wait $LLAMA_PID 2>/dev/null || true
    echo "Stopped."
}
trap cleanup EXIT INT TERM

# --- Start FastAPI ---
echo "Starting Zeke AI..."
PYTHONPATH="$ZEKE_HOME" uvicorn backend.main:app \
    --host "${ZEKE_HOST:-0.0.0.0}" \
    --port "${ZEKE_PORT:-8000}" \
    --workers 1 \
    --log-level "${ZEKE_LOG_LEVEL:-info}"
