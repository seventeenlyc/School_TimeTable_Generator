import json
from pathlib import Path

import pytest

from domain import AppState, SchoolClass
from repository import DataFileError, JsonRepository, RevisionConflict


def test_first_load_creates_a_valid_empty_state(tmp_path: Path):
    repository = JsonRepository(tmp_path / "timetable-data.json")

    state = repository.load()

    assert state.schema_version == 1
    assert state.revision == 0
    stored = json.loads((tmp_path / "timetable-data.json").read_text("utf-8"))
    assert stored["schemaVersion"] == 1
    assert stored["revision"] == 0
    assert {subject.name for subject in state.subjects} == {
        "美术",
        "音乐",
        "信息",
        "通用技术",
    }


def test_existing_state_is_migrated_with_default_subject_options(tmp_path: Path):
    path = tmp_path / "timetable-data.json"
    path.write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "revision": 7,
                "settings": {},
                "teachers": [],
                "classes": [],
                "subjects": [],
                "rooms": [],
                "courseRequirements": [],
                "splitCourseBlocks": [],
                "timetableVersions": [],
                "changeEvents": [],
                "appliedChanges": [],
            }
        ),
        encoding="utf-8",
    )

    state = JsonRepository(path).load()

    assert state.revision == 7
    assert {subject.name for subject in state.subjects} == {
        "美术",
        "音乐",
        "信息",
        "通用技术",
    }
    stored = json.loads(path.read_text("utf-8"))
    assert stored["revision"] == 7
    assert {subject["name"] for subject in stored["subjects"]} == {
        "美术",
        "音乐",
        "信息",
        "通用技术",
    }


def test_save_is_revision_checked_and_creates_a_backup(tmp_path: Path):
    repository = JsonRepository(tmp_path / "timetable-data.json")
    first = repository.load()
    first.classes.append(SchoolClass(id="class-1", name="1班"))

    saved = repository.save(first, base_revision=0)

    assert saved.revision == 1
    saved.classes.append(SchoolClass(id="class-2", name="2班"))
    repository.save(saved, base_revision=1)
    assert len(repository.list_backups()) == 2

    with pytest.raises(RevisionConflict):
        repository.save(saved, base_revision=0)


def test_corrupt_json_is_never_overwritten(tmp_path: Path):
    path = tmp_path / "timetable-data.json"
    path.write_text("{broken", encoding="utf-8")
    repository = JsonRepository(path)

    with pytest.raises(DataFileError):
        repository.load()

    assert path.read_text("utf-8") == "{broken"


def test_restore_validates_backup_and_increments_revision(tmp_path: Path):
    repository = JsonRepository(tmp_path / "timetable-data.json")
    first = repository.load()
    first.classes.append(SchoolClass(id="class-1", name="1班"))
    repository.save(first, base_revision=0)
    first_backup = repository.list_backups()[0]

    restored = repository.restore_backup(first_backup.name)

    assert restored.revision == 2


def test_restore_can_recover_a_corrupt_current_file(tmp_path: Path):
    repository = JsonRepository(tmp_path / "timetable-data.json")
    state = repository.load()
    state.classes.append(SchoolClass(id="class-1", name="1班"))
    repository.save(state, base_revision=0)
    backup = repository.list_backups()[0]
    repository.path.write_text("{broken", encoding="utf-8")

    restored = repository.restore_backup(backup.name)

    assert restored.schema_version == 1
    assert repository.load().revision == restored.revision
