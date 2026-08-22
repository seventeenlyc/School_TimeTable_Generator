from copy import deepcopy

from fastapi.encoders import jsonable_encoder
from fastapi.testclient import TestClient

from factories import make_generation_state, make_two_class_state, place_lesson
from repository import JsonRepository
from server import create_app
from validation import rebuild_resource_indexes


CATALOG_FIELDS = (
    "teachers",
    "classes",
    "subjects",
    "rooms",
    "course_requirements",
    "split_course_blocks",
)


def make_catalog_payload(base_revision):
    state = make_generation_state()
    return {
        "base_revision": base_revision,
        **{
            field: jsonable_encoder(getattr(state, field), by_alias=False)
            for field in CATALOG_FIELDS
        },
    }


def catalog_payload_from_state(state):
    return {
        "base_revision": state["revision"],
        **{field: deepcopy(state[field]) for field in CATALOG_FIELDS},
    }


def prepared_client(tmp_path):
    client = TestClient(create_app(tmp_path / "data.json"))
    response = client.put(
        "/api/catalog",
        json=make_catalog_payload(base_revision=0),
    )
    assert response.status_code == 200
    return client


def generate_preview(client):
    response = client.post(
        "/api/timetables/generate",
        json={"name": "2026 Autumn", "effective_from": "2026-09-01"},
    )
    assert response.status_code == 200
    return response.json()


def save_preview(client, preview, base_revision=1):
    response = client.post(
        "/api/timetables",
        json={"base_revision": base_revision, "version": preview},
    )
    assert response.status_code == 200
    return response.json()


def test_state_starts_without_mongo_or_auth(tmp_path):
    client = TestClient(create_app(tmp_path / "data.json"))

    response = client.get("/api/state")

    assert response.status_code == 200
    assert response.json()["revision"] == 0
    assert response.json()["timetable_versions"] == []


def test_catalog_update_requires_matching_revision(tmp_path):
    client = TestClient(create_app(tmp_path / "data.json"))
    payload = make_catalog_payload(base_revision=0)

    first = client.put("/api/catalog", json=payload)
    stale = client.put("/api/catalog", json=payload)

    assert first.status_code == 200
    assert first.json()["revision"] == 1
    assert stale.status_code == 409
    assert stale.json()["detail"]["current_revision"] == 1


def test_generate_is_preview_only_until_saved(tmp_path):
    client = prepared_client(tmp_path)

    preview = generate_preview(client)

    assert preview["name"] == "2026 Autumn"
    assert client.get("/api/timetables").json() == []
    assert client.get("/api/state").json()["revision"] == 1


def test_preview_can_be_saved_listed_and_read_by_id(tmp_path):
    client = prepared_client(tmp_path)
    preview = generate_preview(client)

    saved_state = save_preview(client, preview)
    listing = client.get("/api/timetables")
    fetched = client.get(f"/api/timetables/{preview['id']}")

    assert saved_state["revision"] == 2
    assert [item["id"] for item in listing.json()] == [preview["id"]]
    assert fetched.status_code == 200
    assert fetched.json() == preview


def test_child_version_is_immutable_and_protects_its_parent(tmp_path):
    client = prepared_client(tmp_path)
    parent = generate_preview(client)
    save_preview(client, parent)
    edited_schedules = deepcopy(parent["class_schedules"])

    child_response = client.post(
        f"/api/timetables/{parent['id']}/versions",
        json={
            "base_revision": 2,
            "name": "Edited version",
            "effective_from": "2026-09-07",
            "class_schedules": edited_schedules,
        },
    )

    assert child_response.status_code == 200
    child_state = child_response.json()
    child = next(
        item
        for item in child_state["timetable_versions"]
        if item["id"] != parent["id"]
    )
    assert child["parent_version_id"] == parent["id"]
    assert client.get(f"/api/timetables/{parent['id']}").json() == parent

    delete_parent = client.delete(f"/api/timetables/{parent['id']}")
    assert delete_parent.status_code == 409


def test_catalog_update_cannot_break_a_historical_version(tmp_path):
    client = prepared_client(tmp_path)
    preview = generate_preview(client)
    save_preview(client, preview)
    payload = make_catalog_payload(base_revision=2)
    payload["subjects"] = [
        subject
        for subject in payload["subjects"]
        if subject["id"] != "subject-math"
    ]

    response = client.put("/api/catalog", json=payload)

    assert response.status_code == 422
    assert client.get("/api/state").json()["revision"] == 2


def test_catalog_teacher_change_rebuilds_saved_resource_indexes(tmp_path):
    client = prepared_client(tmp_path)
    preview = generate_preview(client)
    save_preview(client, preview)
    before = client.get("/api/state").json()
    payload = catalog_payload_from_state(before)
    payload["teachers"].append(
        {
            "id": "teacher-math-replacement",
            "name": "Replacement Math",
            "qualified_subject_ids": ["subject-math"],
            "teaching_assignment_ids": ["req-class1-math"],
            "weekly_unavailable_slots": [],
            "homeroom_class_id": None,
            "main_subject_id": None,
        }
    )
    for teacher in payload["teachers"]:
        teacher["teaching_assignment_ids"] = [
            req["id"]
            for req in payload["course_requirements"]
            if req["teacher_id"] == teacher["id"]
        ]
    target = next(
        req
        for req in payload["course_requirements"]
        if req["id"] == "req-class1-math"
    )
    target["teacher_id"] = "teacher-math-replacement"
    for teacher in payload["teachers"]:
        teacher["teaching_assignment_ids"] = [
            req["id"]
            for req in payload["course_requirements"]
            if req["teacher_id"] == teacher["id"]
        ]

    response = client.put("/api/catalog", json=payload)

    assert response.status_code == 200
    saved_version = response.json()["timetable_versions"][0]
    used_slots = [
        cell
        for day in saved_version["teacher_schedules"]["teacher-math-replacement"]
        for cell in day
        if cell is not None
    ]
    assert used_slots
    assert all(cell["target_id"] == "req-class1-math" for cell in used_slots)

    # The class grids still place class 1 math in room 301.  The room index
    # must be rebuilt from those cells too, including the new teacher, rather
    # than retaining the pre-update assignment or a stale slot.
    requirements_by_id = {
        requirement["id"]: requirement
        for requirement in payload["course_requirements"]
    }
    blocks_by_id = {
        block["id"]: block for block in payload["split_course_blocks"]
    }
    expected_room_entries = {room_id: set() for room_id in ("room-301", "room-302")}
    for class_id, schedule in saved_version["class_schedules"].items():
        for weekday, day in enumerate(schedule):
            for period, cell in enumerate(day):
                if cell is None:
                    continue
                if cell["kind"] == "lesson":
                    requirement = requirements_by_id[cell["requirement_id"]]
                    if requirement["room_id"] in expected_room_entries:
                        expected_room_entries[requirement["room_id"]].add(
                            (
                                weekday,
                                period,
                                requirement["id"],
                                requirement["teacher_id"],
                                (class_id,),
                            )
                        )
                else:
                    block = blocks_by_id[cell["split_block_id"]]
                    for group in block["groups"]:
                        if group["room_id"] in expected_room_entries:
                            expected_room_entries[group["room_id"]].add(
                                (
                                    weekday,
                                    period,
                                    group["id"],
                                    group["teacher_id"],
                                    tuple(block["source_class_ids"]),
                                )
                            )

    room_301 = saved_version["room_schedules"]["room-301"]
    actual_room_301_entries = {
        (weekday, period, cell["target_id"], cell["teacher_id"], tuple(cell["class_ids"]))
        for weekday, day in enumerate(room_301)
        for period, cell in enumerate(day)
        if cell is not None
    }
    assert actual_room_301_entries == expected_room_entries["room-301"]
    assert ("req-class1-math", "teacher-math-replacement") in {
        (target_id, teacher_id)
        for _, _, target_id, teacher_id, _ in actual_room_301_entries
    }
    assert ("req-class1-math", "teacher-li") not in {
        (target_id, teacher_id)
        for _, _, target_id, teacher_id, _ in actual_room_301_entries
    }

    # The other configured room contains only the split politics group; no
    # stale ordinary lesson or reassigned math lesson may appear there.
    room_302 = saved_version["room_schedules"]["room-302"]
    actual_room_302_entries = {
        (weekday, period, cell["target_id"], cell["teacher_id"], tuple(cell["class_ids"]))
        for weekday, day in enumerate(room_302)
        for period, cell in enumerate(day)
        if cell is not None
    }
    assert actual_room_302_entries == expected_room_entries["room-302"]
    assert ("split-group-politics", "teacher-wang") in {
        (target_id, teacher_id)
        for _, _, target_id, teacher_id, _ in actual_room_302_entries
    }

    for room_id, schedule in saved_version["room_schedules"].items():
        for day in schedule:
            for cell in day:
                if cell is not None:
                    assert cell["room_id"] == room_id


def test_catalog_conflict_reports_version_location_and_preserves_state(tmp_path):
    state, version = make_two_class_state()
    place_lesson(version, "class-1", 0, 0, "req-class1-math")
    place_lesson(version, "class-1", 1, 0, "req-class1-math")
    place_lesson(version, "class-1", 0, 2, "req-class1-chinese")
    place_lesson(version, "class-1", 1, 2, "req-class1-chinese")
    place_lesson(version, "class-2", 0, 2, "req-class2-math-same-teacher")
    place_lesson(version, "class-2", 1, 1, "req-class2-math-same-teacher")
    place_lesson(version, "class-2", 0, 3, "req-class2-chinese")
    place_lesson(version, "class-2", 1, 3, "req-class2-chinese")
    state.timetable_versions = [rebuild_resource_indexes(state, version)]
    data_path = tmp_path / "data.json"
    JsonRepository(data_path).save(state, 0)
    client = TestClient(create_app(data_path))
    before = client.get("/api/state").json()
    payload = catalog_payload_from_state(before)
    target = next(
        req
        for req in payload["course_requirements"]
        if req["id"] == "req-class1-chinese"
    )
    target["teacher_id"] = "teacher-li"
    next(
        teacher
        for teacher in payload["teachers"]
        if teacher["id"] == "teacher-li"
    )["qualified_subject_ids"].append("subject-chinese")
    for teacher in payload["teachers"]:
        teacher["teaching_assignment_ids"] = [
            req["id"]
            for req in payload["course_requirements"]
            if req["teacher_id"] == teacher["id"]
        ]

    response = client.put("/api/catalog", json=payload)

    assert response.status_code == 422
    detail = response.json()["detail"]
    issue = next(
        error for error in detail["errors"] if error["code"] == "teacher_double_booked"
    )
    assert issue["weekday"] == 0
    assert issue["period"] == 2
    assert version.id in issue["entity_ids"]
    assert {"teacher-li", "class-1", "class-2"} <= set(issue["entity_ids"])
    assert client.get("/api/state").json() == before


def test_settings_update_mutates_only_settings(tmp_path):
    client = prepared_client(tmp_path)
    before = client.get("/api/state").json()
    settings = deepcopy(before["settings"])
    settings["backup_limit"] = 7

    response = client.put(
        "/api/settings",
        json={"base_revision": 1, "settings": settings},
    )

    assert response.status_code == 200
    after = response.json()
    assert after["settings"]["backup_limit"] == 7
    for field in CATALOG_FIELDS:
        assert after[field] == before[field]


def test_backups_require_confirmation_and_can_be_restored(tmp_path):
    client = prepared_client(tmp_path)
    before_settings_update = client.get("/api/state").json()
    settings = deepcopy(before_settings_update["settings"])
    settings["backup_limit"] = 7
    assert client.put(
        "/api/settings",
        json={"base_revision": 1, "settings": settings},
    ).status_code == 200

    backups = client.get("/api/backups")
    assert backups.status_code == 200
    assert backups.json()
    backup = backups.json()[0]
    assert {"name", "size", "modified_at"} <= backup.keys()

    rejected = client.post(
        f"/api/backups/{backup['name']}/restore",
        json={"confirmed": False},
    )
    restored = client.post(
        f"/api/backups/{backup['name']}/restore",
        json={"confirmed": True},
    )

    assert rejected.status_code == 400
    assert restored.status_code == 200
    assert restored.json()["revision"] == 3
    assert restored.json()["settings"] == before_settings_update["settings"]
