import copy
from datetime import date, timedelta
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from domain import (
    CellOverride,
    ChangeEvent,
    ChangeEventKind,
    ChangeOperation,
    ChangeProposal,
    DateException,
    DateSlot,
    LessonCell,
    ProposalScore,
)
import server
from server import create_app
from tests.factories import (
    make_conflict_free_requirements,
    make_four_slot_settings,
    make_standard_classes,
    make_standard_rooms,
    make_standard_subjects,
    make_standard_teachers,
)


def _client_with_generated_timetable(tmp_path: Path) -> TestClient:
    data_file = tmp_path / "timetable-data.json"
    app = create_app(data_file)
    client = TestClient(app)

    # 1. Update settings
    client.put(
        "/api/settings",
        json={"base_revision": 0, "settings": make_four_slot_settings().dict()},
    )
    rev = client.get("/api/state").json()["revision"]

    # 2. Update catalog
    catalog = {
        "base_revision": rev,
        "teachers": [t.dict() for t in make_standard_teachers()],
        "classes": [c.dict() for c in make_standard_classes()],
        "subjects": [s.dict() for s in make_standard_subjects()],
        "rooms": [r.dict() for r in make_standard_rooms()],
        "course_requirements": [
            r.dict() for r in make_conflict_free_requirements()
        ],
        "split_course_blocks": [],
    }
    client.put("/api/catalog", json=catalog)

    # 3. Generate base timetable (preview only)
    gen_response = client.post(
        "/api/timetables/generate",
        json={"name": "2026-Autumn-V1", "effective_from": "2026-09-01"},
    )
    assert gen_response.status_code == 200
    preview = gen_response.json()

    # 4. Save the generated version so it becomes active
    rev = client.get("/api/state").json()["revision"]
    save_response = client.post(
        "/api/timetables",
        json={"base_revision": rev, "version": preview},
    )
    assert save_response.status_code == 200
    return client


def _absence_payload() -> dict:
    return {
        "event": {
            "id": "evt-abs-1",
            "teacher_id": "T-ZHANG",
            "kind": "absence",
            # 2026-09-07 is a Monday; T-ZHANG teaches REQ-C1-MATH in period 0
            "start_date": "2026-09-07",
            "end_date": "2026-09-07",
            "busy_slots": [],
            "reason": "Sick leave",
        }
    }


def _busy_payload() -> dict:
    return {
        "event": {
            "id": "evt-busy-1",
            "teacher_id": "T-ZHANG",
            "kind": "busy",
            "start_date": None,
            "end_date": None,
            "busy_slots": [{"date": "2026-09-07", "period": 0}],
            "reason": "Department meeting",
        }
    }


def test_proposal_does_not_mutate_state(tmp_path):
    client = _client_with_generated_timetable(tmp_path)
    before_rev = client.get("/api/state").json()["revision"]

    response = client.post("/api/change-proposals", json=_absence_payload())
    assert response.status_code == 200
    data = response.json()
    assert "proposals" in data
    assert len(data["proposals"]) >= 1
    assert data["base_revision"] == before_rev

    # State was not mutated
    after_rev = client.get("/api/state").json()["revision"]
    assert after_rev == before_rev


def test_apply_revalidates_and_persists_selected_proposal(tmp_path):
    client = _client_with_generated_timetable(tmp_path)
    prop_res = client.post("/api/change-proposals", json=_busy_payload())
    assert prop_res.status_code == 200
    proposals = prop_res.json()["proposals"]
    assert len(proposals) > 0
    selected = proposals[0]

    apply_res = client.post("/api/changes/apply", json={"proposal": selected})
    assert apply_res.status_code == 200

    state = client.get("/api/state").json()
    assert state["revision"] == selected["base_revision"] + 1
    assert len(state["applied_changes"]) == 1
    assert state["applied_changes"][0]["event"]["id"] == "evt-busy-1"
    assert state["applied_changes"][0]["event"]["status"] == "applied"


def test_stale_proposal_is_rejected_with_conflict(tmp_path):
    client = _client_with_generated_timetable(tmp_path)
    prop_res = client.post("/api/change-proposals", json=_absence_payload())
    proposal = prop_res.json()["proposals"][0]

    # Stale the revision by mutating settings
    state = client.get("/api/state").json()
    settings = state["settings"]
    settings["school_name"] = "Updated School Name"
    client.put(
        "/api/settings",
        json={"base_revision": state["revision"], "settings": settings},
    )

    # Applying the old proposal with old base_revision should fail with 409
    apply_res = client.post("/api/changes/apply", json={"proposal": proposal})
    assert apply_res.status_code == 409


def test_tampered_proposal_is_rejected(tmp_path):
    client = _client_with_generated_timetable(tmp_path)
    prop_res = client.post("/api/change-proposals", json=_absence_payload())
    proposal = prop_res.json()["proposals"][0]

    # Tamper with the proposal (change event teacher_id)
    tampered = dict(proposal)
    tampered["event"] = dict(tampered["event"])
    tampered["event"]["teacher_id"] = "T-NONEXISTENT"

    apply_res = client.post("/api/changes/apply", json={"proposal": tampered})
    assert apply_res.status_code in (404, 422)


def test_same_size_tampered_proposal_is_rejected_without_mutation(tmp_path):
    client = _client_with_generated_timetable(tmp_path)
    prop_res = client.post("/api/change-proposals", json=_absence_payload())
    proposal = prop_res.json()["proposals"][0]

    state_before = client.get("/api/state").json()
    rev_before = state_before["revision"]
    applied_changes_len_before = len(state_before["applied_changes"])

    tampered = copy.deepcopy(proposal)
    tampered["id"] = "tampered-proposal-id"
    tampered["explanation"] = "tampered explanation"
    tampered["operations"][0]["after_label"] = "tampered operation"

    apply_res = client.post("/api/changes/apply", json={"proposal": tampered})
    assert apply_res.status_code == 422

    state_after = client.get("/api/state").json()
    assert state_after["revision"] == rev_before
    assert len(state_after["applied_changes"]) == applied_changes_len_before


def test_list_applied_changes_endpoint(tmp_path):
    client = _client_with_generated_timetable(tmp_path)

    # Initially empty
    res = client.get("/api/changes")
    assert res.status_code == 200
    assert res.json() == []

    # Apply a change
    prop_res = client.post("/api/change-proposals", json=_busy_payload())
    proposal = prop_res.json()["proposals"][0]
    client.post("/api/changes/apply", json={"proposal": proposal})

    # Now has 1 change
    res2 = client.get("/api/changes")
    assert res2.status_code == 200
    changes = res2.json()
    assert len(changes) == 1
    assert changes[0]["event"]["id"] == "evt-busy-1"


def test_calendar_day_endpoint(tmp_path):
    client = _client_with_generated_timetable(tmp_path)

    # 1. Valid school day
    res = client.get("/api/calendar/day?date=2026-09-08")
    assert res.status_code == 200
    day = res.json()
    assert day["date"] == "2026-09-08"
    assert "class_schedules" in day

    # 2. Invalid date format
    res_inv = client.get("/api/calendar/day?date=not-a-date")
    assert res_inv.status_code == 422

    # 3. Date before timetable starts
    res_before = client.get("/api/calendar/day?date=2025-01-01")
    assert res_before.status_code == 404


def test_apply_change_rejects_resolved_real_date_conflict(tmp_path, monkeypatch):
    client = _client_with_generated_timetable(tmp_path)

    # Verify baseline schedule for 2026-09-07 Monday period 0 has C-1 taking REQ-C1-MATH in R-101
    day_res = client.get("/api/calendar/day?date=2026-09-07")
    assert day_res.status_code == 200
    day_data = day_res.json()
    c1_lessons = day_data["class_schedules"]["C-1"]
    assert c1_lessons[0] is not None
    assert c1_lessons[0]["cell"]["kind"] == "lesson"
    assert c1_lessons[0]["cell"]["requirement_id"] == "REQ-C1-MATH"

    state_before = client.get("/api/state").json()
    rev_before = state_before["revision"]
    base_version_id = state_before["timetable_versions"][0]["id"]
    applied_before_count = len(state_before["applied_changes"])

    # Construct a well-typed ChangeProposal that causes room R-101 double booking on 2026-09-07 period 0:
    # C-1 has REQ-C1-MATH (room R-101) and override places REQ-C1-PHYS (room R-101) in C-2 at period 0.
    proposal = ChangeProposal(
        id="prop-room-conflict-1",
        base_revision=rev_before,
        base_version_id=base_version_id,
        event=ChangeEvent(
            id="evt-busy-test-1",
            teacher_id="T-ZHANG",
            kind=ChangeEventKind.BUSY,
            busy_slots=[DateSlot(date=date(2026, 9, 7), period=0)],
            reason="Test room conflict",
        ),
        strategy="slot_swap_same_day",
        explanation="Test proposal creating room double-booking on resolved day",
        score=ProposalScore(
            strategy_tier=1,
            changed_cells=1,
            affected_classes=1,
            affected_teachers=1,
            moved_split_blocks=0,
            slot_distance=0,
        ),
        operations=[
            ChangeOperation(
                date=date(2026, 9, 7),
                period=0,
                class_ids=["C-2"],
                kind="swap",
                before_label="Empty",
                after_label="REQ-C1-PHYS",
            )
        ],
        date_exceptions=[
            DateException(
                date=date(2026, 9, 7),
                cell_overrides=[
                    CellOverride(
                        date=date(2026, 9, 7),
                        class_id="C-2",
                        period=0,
                        before=None,
                        after=LessonCell(
                            kind="lesson",
                            requirement_id="REQ-C1-PHYS",
                        ),
                    )
                ],
                teacher_substitutions=[],
            )
        ],
        version_candidate=None,
    )

    # Monkeypatch server.propose_changes to return this canonical proposal
    monkeypatch.setattr(server, "propose_changes", lambda state, event: [proposal])

    # POST /api/changes/apply expecting 422
    apply_res = client.post("/api/changes/apply", json={"proposal": json.loads(proposal.json())})
    assert apply_res.status_code == 422
    assert apply_res.json()["detail"]["code"] in (
        "resolved_schedule_conflict",
        "date_exception_invalid",
    )

    # Assert state revision and applied_changes count remain completely unchanged
    state_after = client.get("/api/state").json()
    assert state_after["revision"] == rev_before
    assert len(state_after["applied_changes"]) == applied_before_count
