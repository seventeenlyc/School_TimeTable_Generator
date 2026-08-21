from datetime import date

import pytest
from pydantic import ValidationError

from domain import AppState, ChangeEvent, ChangeEventKind, ChangeEventStatus, DateSlot, LessonCell, Settings


def test_absence_requires_an_ordered_date_range():
    with pytest.raises(ValidationError):
        ChangeEvent(
            kind=ChangeEventKind.ABSENCE,
            teacher_id="teacher-1",
            start_date=date(2026, 9, 10),
            end_date=date(2026, 9, 1),
        )


def test_busy_requires_real_date_slots():
    event = ChangeEvent(
        kind=ChangeEventKind.BUSY,
        teacher_id="teacher-1",
        busy_slots=[DateSlot(date=date(2026, 9, 2), period=1)],
    )
    assert event.start_date is None
    assert event.busy_slots[0].period == 1


def test_lesson_cell_accepts_exactly_one_reference():
    with pytest.raises(ValidationError):
        LessonCell(kind="lesson", requirement_id="req-1", split_block_id="block-1")

    cell = LessonCell(kind="split", split_block_id="block-1")
    assert cell.requirement_id is None


def test_settings_are_fixed_to_monday_through_saturday():
    settings = Settings(periods_per_day=8)
    assert settings.working_days == 6
    assert settings.long_absence_days == 28
    assert settings.dict(by_alias=True)["longAbsenceDays"] == 28


def test_change_event_defaults_to_pending():
    event = ChangeEvent(kind=ChangeEventKind.BUSY, teacher_id="t1", busy_slots=[DateSlot(date=date(2026, 9, 2), period=1)])
    assert event.status == ChangeEventStatus.PENDING


def test_absence_missing_start_date_raises_error():
    with pytest.raises(ValidationError):
        ChangeEvent(kind=ChangeEventKind.ABSENCE, teacher_id="t1")


def test_absence_with_busy_slots_raises_error():
    with pytest.raises(ValidationError):
        ChangeEvent(
            kind=ChangeEventKind.ABSENCE,
            teacher_id="t1",
            start_date=date(2026, 9, 1),
            end_date=date(2026, 9, 10),
            busy_slots=[DateSlot(date=date(2026, 9, 2), period=1)],
        )


def test_busy_with_zero_slots_raises_error():
    with pytest.raises(ValidationError):
        ChangeEvent(kind=ChangeEventKind.BUSY, teacher_id="t1")


def test_busy_with_date_range_raises_error():
    with pytest.raises(ValidationError):
        ChangeEvent(
            kind=ChangeEventKind.BUSY,
            teacher_id="t1",
            start_date=date(2026, 9, 1),
            busy_slots=[DateSlot(date=date(2026, 9, 2), period=1)],
        )


def test_lesson_cell_happy_path():
    lesson = LessonCell(kind="lesson", requirement_id="req-1")
    assert lesson.requirement_id == "req-1"
    assert lesson.split_block_id is None

    split = LessonCell(kind="split", split_block_id="block-1")
    assert split.split_block_id == "block-1"
    assert split.requirement_id is None


def test_lesson_cell_both_none_raises_error():
    with pytest.raises(ValidationError):
        LessonCell(kind="lesson")


def test_appstate_round_trip():
    state = AppState(revision=5)
    json_str = state.json(by_alias=True)
    parsed = AppState.parse_raw(json_str)
    assert parsed.schema_version == state.schema_version == 1
    assert parsed.revision == state.revision == 5