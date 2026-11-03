#!/bin/bash
set -euo pipefail

# =============================================================================
# Zeke AI Bootstrap Script
# Provisions a bare Instabox container into a fully operational Zeke AI instance
# =============================================================================

ZEKE_HOME="${ZEKE_BASE_DIR:-$HOME/zeke-ai}"
MODELS_DIR="${ZEKE_MODELS_DIR:-$ZEKE_HOME/models}"
DATA_DIR="${ZEKE_DATA_DIR:-$ZEKE_HOME/data}"

echo "=========================================="
echo "  Zeke AI Bootstrap"
echo "=========================================="
echo ""

# --- 1. System dependencies ---
echo "[1/7] Installing system dependencies..."
apt-get update -qq
apt-get install -y --no-install-recommends \
    build-essential cmake git curl wget \
    python3 python3-pip python3-venv python3-dev \
    ffmpeg espeak-ng \
    > /dev/null 2>&1
echo "  Done."

# --- 2. Node.js (for frontend build) ---
if ! command -v node &> /dev/null; then
    echo "[2/7] Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y --no-install-recommends nodejs > /dev/null 2>&1
else
    echo "[2/7] Node.js already installed."
fi
echo "  Done."

# --- 3. Python environment ---
echo "[3/7] Setting up Python environment..."
cd "$ZEKE_HOME"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install --no-cache-dir -q -r backend/requirements.txt
echo "  Done."

# --- 4. Build frontend ---
echo "[4/7] Building frontend..."
cd "$ZEKE_HOME/frontend"
if [ ! -d "node_modules" ]; then
    npm ci --silent
fi
npm run build --silent
cd "$ZEKE_HOME"
echo "  Done."

# --- 5. Download models ---
echo "[5/7] Downloading AI models..."
mkdir -p "$MODELS_DIR"

download_model() {
    local url="$1"
    local dest="$2"
    local name="$(basename "$dest")"
    if [ -f "$dest" ]; then
        echo "  $name already exists, skipping."
    else
        echo "  Downloading $name..."
        wget -q --show-progress -O "$dest" "$url"
    fi
}

# Download in parallel
download_model \
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin" \
    "$MODELS_DIR/ggml-base.en.bin" &
PID1=$!

download_model \
    "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf" \
    "$MODELS_DIR/qwen2.5-1.5b-instruct-q4_k_m.gguf" &
PID2=$!

download_model \
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx" \
    "$MODELS_DIR/en_US-lessac-medium.onnx" &
PID3=$!

download_model \
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json" \
    "$MODELS_DIR/en_US-lessac-medium.onnx.json" &
PID4=$!

wait $PID1 $PID2 $PID3 $PID4
echo "  All models downloaded."

# --- 6. Build llama.cpp server ---
echo "[6/7] Building llama.cpp server..."
if [ -f "$ZEKE_HOME/llama-server" ]; then
    echo "  llama-server already built, skipping."
else
    LLAMA_TMP="/tmp/llama.cpp"
    if [ ! -d "$LLAMA_TMP" ]; then
        git clone --depth 1 https://github.com/ggerganov/llama.cpp.git "$LLAMA_TMP"
    fi
    cd "$LLAMA_TMP"
    cmake -B build -DCMAKE_BUILD_TYPE=Release > /dev/null 2>&1
    cmake --build build --target llama-server -j$(nproc) > /dev/null 2>&1
    cp build/bin/llama-server "$ZEKE_HOME/llama-server"
    cd "$ZEKE_HOME"
    echo "  llama-server built successfully."
fi

# --- 7. Restore data from backup ---
echo "[7/7] Checking for data backup..."
mkdir -p "$DATA_DIR"
if [ -n "${ZEKE_GITHUB_TOKEN:-}" ] && [ -n "${ZEKE_BACKUP_REPO:-}" ]; then
    BACKUP_REPO_DIR="/tmp/zeke-backup"
    if git clone "https://${ZEKE_GITHUB_TOKEN}@github.com/${ZEKE_BACKUP_REPO}.git" "$BACKUP_REPO_DIR" 2>/dev/null; then
        if [ -f "$BACKUP_REPO_DIR/zeke.db.gz" ]; then
            gunzip -c "$BACKUP_REPO_DIR/zeke.db.gz" > "$DATA_DIR/zeke.db"
            echo "  Database restored from backup."
        else
            echo "  No backup found in repo."
        fi
        rm -rf "$BACKUP_REPO_DIR"
    else
        echo "  Could not access backup repo."
    fi
else
    echo "  No backup configured (set ZEKE_GITHUB_TOKEN and ZEKE_BACKUP_REPO)."
fi

echo ""
echo "=========================================="
echo "  Bootstrap complete!"
echo "  Run: ./start.sh"
echo "=========================================="
