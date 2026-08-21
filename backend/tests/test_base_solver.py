from datetime import date

import pytest

from base_solver import GenerationError, generate_base_timetable
from factories import make_generation_state, make_impossible_room_state
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
