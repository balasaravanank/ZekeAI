# Zeke AI

Self-hosted voice assistant. All inference runs locally — no cloud APIs.

## Requirements

- Linux (Ubuntu 22.04+)
- 4 vCPU, 8 GB RAM, 20 GB storage
- No GPU required

## Models

| Component | Model | Size |
|-----------|-------|------|
| STT | whisper.cpp base.en | 148 MB |
| LLM | Qwen 2.5 1.5B Instruct Q4_K_M | 1.12 GB |
| TTS | Piper en_US-lessac-medium | 64 MB |

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/balasaravanank/ZekeAI.git ~/zeke-ai
cd ~/zeke-ai

# 2. Copy and edit environment config
cp .env.example .env
# Edit .env — set ZEKE_JWT_SECRET and ZEKE_USERS_JSON

# 3. Run bootstrap (installs deps, downloads models, builds frontend)
chmod +x bootstrap.sh start.sh
./bootstrap.sh

# 4. Start Zeke
./start.sh
```

Open `http://localhost:8000` in your browser.

## Creating Users

Generate a bcrypt password hash:

```bash
python3 -c "from passlib.hash import bcrypt; print(bcrypt.hash('your_password'))"
```

Add to `.env`:

```
ZEKE_USERS_JSON={"alice": "$2b$12$...", "bob": "$2b$12$..."}
```

## Instabox Deployment

```bash
npx instabox@latest sh
# Inside the container:
git clone https://github.com/balasaravanank/ZekeAI.git ~/zeke-ai
cd ~/zeke-ai
cp .env.example .env
# Edit .env
./bootstrap.sh
./start.sh
```

## Backup

Set these in `.env` to enable automatic database backup:

```
ZEKE_GITHUB_TOKEN=ghp_xxxxxxxxxxxx
ZEKE_BACKUP_REPO=yourusername/zeke-ai-data
```

The database is backed up every 15 minutes and on shutdown.

## API

- `POST /api/auth/login` — authenticate
- `GET /api/health` — system status
- `GET /api/conversations` — list conversations
- `GET /api/conversations/:id` — get conversation with messages
- `DELETE /api/conversations/:id` — delete conversation
- `GET /api/memories` — list memories
- `PUT /api/memories/:id` — update memory
- `DELETE /api/memories/:id` — delete memory
- `GET /api/settings` — get user settings
- `PUT /api/settings` — update user settings
- `WS /ws/conversation?token=<jwt>` — voice conversation
