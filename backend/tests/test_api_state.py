from copy import deepcopy

from fastapi.encoders import jsonable_encoder
from fastapi.testclient import TestClient

from factories import make_generation_state
from server import create_app


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
