from __future__ import annotations

import json
import os
import shutil
import tempfile
import threading
from datetime import datetime
from pathlib import Path
from typing import Callable, List, Optional

from domain import AppState, Subject


DEFAULT_DATA_PATH = Path(__file__).resolve().parent / "data" / "timetable-data.json"

DEFAULT_SUBJECT_OPTIONS = (
    ("subject-art", "美术"),
    ("subject-music", "音乐"),
    ("subject-information", "信息"),
    ("subject-general-technology", "通用技术"),
)


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
            state = self._parse_state_file(self.path)
            return self._ensure_default_subject_options(state)

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
        state = self._ensure_default_subject_options(AppState(), persist=False)
        self._atomic_write(state)
        return state.copy(deep=True)

    def _ensure_default_subject_options(
        self,
        state: AppState,
        *,
        persist: bool = True,
    ) -> AppState:
        existing_ids = {subject.id for subject in state.subjects}
        existing_names = {subject.name for subject in state.subjects}
        changed = False

        for subject_id, subject_name in DEFAULT_SUBJECT_OPTIONS:
            if subject_id in existing_ids or subject_name in existing_names:
                continue
            state.subjects.append(Subject(id=subject_id, name=subject_name))
            existing_ids.add(subject_id)
            existing_names.add(subject_name)
            changed = True

        if changed and persist:
            self._atomic_write(state)
        return state

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
            payload = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("state root must be an object")
            JsonRepository._migrate_legacy_workweek(payload)
            return AppState.parse_obj(payload)
        except (OSError, ValueError) as exc:
            raise DataFileError(f"cannot read valid state from {path}: {exc}") from exc

    @staticmethod
    def _migrate_legacy_workweek(payload: dict) -> None:
        settings = payload.setdefault("settings", {})
        working_days_key = (
            "workingDays" if "workingDays" in settings else "working_days"
        )
        if settings.get(working_days_key, 5) != 6:
            return

        settings[working_days_key] = 5
        subjects = {
            subject.get("id"): subject.get("name")
            for subject in payload.get("subjects", [])
        }
        requirements_key = (
            "courseRequirements"
            if "courseRequirements" in payload
            else "course_requirements"
        )
        requirements = payload.get(requirements_key, [])
        removed_requirement_ids = {
            requirement.get("id")
            for requirement in requirements
            if subjects.get(
                requirement.get("subjectId", requirement.get("subject_id"))
            )
            == "自习（固定活动）"
        }

        for teacher in payload.get("teachers", []):
            slots_key = (
                "weeklyUnavailableSlots"
                if "weeklyUnavailableSlots" in teacher
                else "weekly_unavailable_slots"
            )
            teacher[slots_key] = [
                slot
                for slot in teacher.get(slots_key, [])
                if slot.get("weekday", 0) < 5
            ]
            assignments_key = (
                "teachingAssignmentIds"
                if "teachingAssignmentIds" in teacher
                else "teaching_assignment_ids"
            )
            teacher[assignments_key] = [
                assignment_id
                for assignment_id in teacher.get(assignments_key, [])
                if assignment_id not in removed_requirement_ids
            ]

        retained_requirements = []
        for requirement in requirements:
            if requirement.get("id") in removed_requirement_ids:
                continue
            slots_key = "fixedSlots" if "fixedSlots" in requirement else "fixed_slots"
            requirement[slots_key] = [
                slot
                for slot in requirement.get(slots_key, [])
                if slot.get("weekday", 0) < 5
            ]
            retained_requirements.append(requirement)
        payload[requirements_key] = retained_requirements

        versions_key = (
            "timetableVersions"
            if "timetableVersions" in payload
            else "timetable_versions"
        )
        applied_key = "appliedChanges" if "appliedChanges" in payload else "applied_changes"
        payload[versions_key] = []
        payload[applied_key] = []

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
