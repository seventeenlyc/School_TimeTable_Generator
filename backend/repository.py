from __future__ import annotations

import os
import shutil
import tempfile
import threading
from datetime import datetime
from pathlib import Path
from typing import Callable, List, Optional

from domain import AppState


DEFAULT_DATA_PATH = Path(__file__).resolve().parent / "data" / "timetable-data.json"


class RevisionConflict(Exception):
    def __init__(self, base_revision: int, current_revision: int):
        self.base_revision = base_revision
        self.current_revision = current_revision
        super().__init__(
            f"base revision {base_revision} does not match current revision "
            f"{current_revision}"
        )


class DataFileError(Exception):
    """Raised when a persisted state or selected backup cannot be parsed."""


class JsonRepository:
    def __init__(
        self,
        path: Optional[Path] = None,
        backup_limit: int = 20,
    ):
        if backup_limit < 1:
            raise ValueError("backup_limit must be at least 1")
        self.path = Path(path) if path is not None else DEFAULT_DATA_PATH
        self.backup_dir = self.path.parent / "backups"
        self.backup_limit = backup_limit
        self._lock = threading.RLock()

    def load(self) -> AppState:
        with self._lock:
            if not self.path.exists():
                self.path.parent.mkdir(parents=True, exist_ok=True)
                return self._write_initial_state()
            return self._parse_state_file(self.path)

    def save(self, state: AppState, base_revision: int) -> AppState:
        with self._lock:
            candidate = self._validate_state(state)
            current = self.load()
            if current.revision != base_revision:
                raise RevisionConflict(base_revision, current.revision)

            candidate.revision = current.revision + 1
            self._backup_current()
            self._atomic_write(candidate)
            self._prune_backups()
            return candidate.copy(deep=True)

    def mutate(
        self,
        base_revision: int,
        mutation: Callable[[AppState], AppState],
    ) -> AppState:
        with self._lock:
            current = self.load()
            if current.revision != base_revision:
                raise RevisionConflict(base_revision, current.revision)
            candidate = mutation(current.copy(deep=True))
            return self.save(candidate, base_revision)

    def list_backups(self) -> List[Path]:
        with self._lock:
            if not self.backup_dir.exists():
                return []
            backups = list(self.backup_dir.glob("backup-*.json"))
            return sorted(
                backups,
                key=lambda backup: (backup.stat().st_mtime_ns, backup.name),
                reverse=True,
            )

    def restore_backup(self, name: str) -> AppState:
        self._validate_backup_name(name)
        with self._lock:
            backup_path = self.backup_dir / name
            backup_state = self._parse_state_file(backup_path)

            current_state: Optional[AppState] = None
            current_is_corrupt = False
            if self.path.exists():
                try:
                    current_state = self._parse_state_file(self.path)
                except DataFileError:
                    current_is_corrupt = True

            restored = backup_state.copy(deep=True)
            if current_state is not None:
                restored.revision = max(
                    current_state.revision,
                    backup_state.revision,
                ) + 1
                self._backup_current()
            else:
                restored.revision = backup_state.revision + 1
                if current_is_corrupt:
                    self._backup_corrupt_current()

            self._atomic_write(restored)
            self._prune_backups()
            return restored.copy(deep=True)

    def _write_initial_state(self) -> AppState:
        state = AppState()
        self._atomic_write(state)
        return state.copy(deep=True)

    @staticmethod
    def _validate_state(state: AppState) -> AppState:
        if not isinstance(state, AppState):
            raise TypeError("state must be an AppState")
        return AppState.parse_raw(state.json(by_alias=True))

    @staticmethod
    def _validate_backup_name(name: str) -> None:
        if (
            not name
            or name in {".", ".."}
            or "/" in name
            or "\\" in name
            or Path(name).name != name
        ):
            raise DataFileError("invalid backup name")

    @staticmethod
    def _parse_state_file(path: Path) -> AppState:
        try:
            return AppState.parse_raw(path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as exc:
            raise DataFileError(f"cannot read valid state from {path}: {exc}") from exc

    def _atomic_write(self, state: AppState) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        encoded = state.json(by_alias=True, ensure_ascii=False, indent=2)
        handle, temp_name = tempfile.mkstemp(
            dir=str(self.path.parent),
            prefix="timetable-",
            suffix=".tmp",
        )
        try:
            with os.fdopen(handle, "w", encoding="utf-8", newline="\n") as stream:
                stream.write(encoded)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temp_name, self.path)
        finally:
            if os.path.exists(temp_name):
                os.unlink(temp_name)

    def _backup_current(self) -> Path:
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        backup_path = self.backup_dir / self._timestamped_name("backup")
        shutil.copy2(self.path, backup_path)
        return backup_path

    def _backup_corrupt_current(self) -> Path:
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        backup_path = self.backup_dir / self._timestamped_name("corrupt")
        shutil.copyfile(self.path, backup_path)
        return backup_path

    @staticmethod
    def _timestamped_name(prefix: str) -> str:
        timestamp = datetime.now().astimezone().strftime("%Y%m%d-%H%M%S-%f")
        return f"{prefix}-{timestamp}.json"

    def _prune_backups(self) -> None:
        for backup in self.list_backups()[self.backup_limit :]:
            backup.unlink()
