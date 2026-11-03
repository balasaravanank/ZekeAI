from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.api.router import api_router
from backend.config.settings import settings
from backend.memory.database import get_db, close_db
from backend.services.model_manager import load_all_models, unload_all_models
from backend.services.backup import backup_loop, backup_database
from backend.ws.handler import router as ws_router

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger(__name__)

_backup_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _backup_task

    log.info("Zeke AI starting up...")

    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.models_dir.mkdir(parents=True, exist_ok=True)

    await get_db()
    log.info("Database initialized")

    await load_all_models()

    if settings.github_token and settings.backup_repo:
        _backup_task = asyncio.create_task(backup_loop())
        log.info("Backup service started (interval: %d min)", settings.backup_interval_minutes)

    log.info("Zeke AI is ready")
    yield

    log.info("Zeke AI shutting down...")

    if _backup_task:
        _backup_task.cancel()
        try:
            await _backup_task
        except asyncio.CancelledError:
            pass

    if settings.github_token and settings.backup_repo:
        await backup_database()

    await unload_all_models()
    await close_db()

    log.info("Zeke AI stopped")


app = FastAPI(
    title="Zeke AI",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(ws_router)

frontend_dist = settings.base_dir / "frontend" / "dist"
if frontend_dist.exists():
    from fastapi.responses import FileResponse

    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.get("/{path:path}")
    async def serve_frontend(path: str):
        file_path = frontend_dist / path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(frontend_dist / "index.html"))
