from datetime import date

import pytest

from base_solver import GenerationError, generate_base_timetable
from domain import Slot
from factories import make_generation_state, make_impossible_room_state, make_two_class_state
from validation import validate_timetable_version


def split_slots(version, class_id, block_id):
    return {
        (day, period)
        for day, row in enumerate(version.class_schedules[class_id])
        for period, cell in enumerate(row)
        if cell is not None and cell.split_block_id == block_id
    }


def test_generator_meets_weekly_counts_and_unavailability():
    state = make_generation_state()
    version = generate_base_timetable(state, "2026秋季", date(2026, 9, 1))
    report = validate_timetable_version(state, version)
    assert report.valid, report.errors
    unavailable = {
        (slot.weekday, slot.period)
        for slot in state.teachers[0].weekly_unavailable_slots
    }
    assert all(
        version.class_schedules["class-1"][day][period] is None
        or version.class_schedules["class-1"][day][period].requirement_id
        != "req-class1-math"
        for day, period in unavailable
    )


def test_generator_places_split_blocks_in_lockstep():
    state = make_generation_state()
    version = generate_base_timetable(state, "2026秋季", date(2026, 9, 1))
    class_1_slots = split_slots(
        version,
        "class-1",
        "split-geography-politics",
    )
    class_2_slots = split_slots(
        version,
        "class-2",
        "split-geography-politics",
    )
    assert class_1_slots == class_2_slots


def test_generator_returns_diagnostics_for_impossible_room_use():
    state = make_impossible_room_state()
    with pytest.raises(GenerationError) as exc:
        generate_base_timetable(state, "冲突", date(2026, 9, 1))
    assert "room_capacity" in {
        item.code for item in exc.value.diagnostics
    }


def test_generator_respects_fixed_course_requirement_slots():
    state, _ = make_two_class_state()
    req = next(r for r in state.course_requirements if r.id == "req-class1-math")
    req.fixed_slots = [Slot(weekday=1, period=2)]
    version = generate_base_timetable(state, "2026秋季", date(2026, 9, 1))
    report = validate_timetable_version(state, version)
    assert report.valid, report.errors
    cell = version.class_schedules["class-1"][1][2]
    assert cell is not None and cell.requirement_id == "req-class1-math"


def test_generator_limits_split_block_daily_frequency():
    state, _ = make_two_class_state()
    state.settings.max_daily_subject_periods = 1
    split_block = state.split_course_blocks[0]
    split_block.periods_per_week = 6
    state.course_requirements = [
        r for r in state.course_requirements
        if r.subject_id not in {"subject-geography", "subject-politics"}
    ]
    version = generate_base_timetable(state, "2026秋季", date(2026, 9, 1))
    report = validate_timetable_version(state, version)
    assert report.valid, report.errors
    for day in range(state.settings.working_days):
        day_splits = [
            cell for cell in version.class_schedules["class-1"][day]
            if cell is not None and cell.split_block_id == split_block.id
        ]
        assert len(day_splits) <= 1
