from __future__ import annotations

import asyncio
import gzip
import logging
import shutil
import subprocess
import tempfile
from pathlib import Path

from backend.config.settings import settings
from backend.memory.database import get_db

log = logging.getLogger(__name__)


async def backup_database() -> bool:
    if not settings.github_token or not settings.backup_repo:
        return False

    db = await get_db()
    backup_dir = settings.data_dir / "backup"
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup_path = backup_dir / "zeke.db"

    try:
        await db.execute(f"VACUUM INTO '{backup_path}'")

        gz_path = backup_dir / "zeke.db.gz"
        with open(backup_path, "rb") as f_in, gzip.open(gz_path, "wb") as f_out:
            shutil.copyfileobj(f_in, f_out)

        repo_dir = backup_dir / "repo"
        if not (repo_dir / ".git").exists():
            subprocess.run(
                ["git", "clone", f"https://{settings.github_token}@github.com/{settings.backup_repo}.git", str(repo_dir)],
                capture_output=True,
                timeout=30,
            )

        shutil.copy2(gz_path, repo_dir / "zeke.db.gz")

        subprocess.run(["git", "add", "zeke.db.gz"], cwd=str(repo_dir), capture_output=True, timeout=10)
        subprocess.run(
            ["git", "commit", "-m", "Automated backup"],
            cwd=str(repo_dir),
            capture_output=True,
            timeout=10,
        )
        result = subprocess.run(
            ["git", "push"],
            cwd=str(repo_dir),
            capture_output=True,
            timeout=30,
        )

        if result.returncode == 0:
            log.info("Database backed up successfully")
            return True
        else:
            log.warning("Backup push failed: %s", result.stderr.decode())
            return False

    except Exception:
        log.exception("Database backup failed")
        return False


async def backup_loop() -> None:
    interval = settings.backup_interval_minutes * 60
    while True:
        await asyncio.sleep(interval)
        await backup_database()
