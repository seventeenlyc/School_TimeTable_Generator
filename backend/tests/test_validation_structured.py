import pytest

from domain import LessonCell, Slot
from factories import make_two_class_state, place_lesson, place_split
from validation import (
    ScheduleValidationError,
    assert_valid_version,
    rebuild_resource_indexes,
    validate_catalog,
    validate_timetable_version,
)


def error_codes(report):
    return {issue.code for issue in report.errors}


def test_teacher_double_booking_is_reported():
    state, version = make_two_class_state()
    place_lesson(version, "class-1", 0, 0, "req-class1-math")
    place_lesson(
        version,
        "class-2",
        0,
        0,
        "req-class2-math-same-teacher",
    )

    report = validate_timetable_version(state, version)

    assert "teacher_double_booked" in error_codes(report)


def test_split_block_must_appear_for_every_source_class():
    state, version = make_two_class_state()
    version.class_schedules["class-1"][1][2] = LessonCell(
        kind="split",
        split_block_id="split-geography-politics",
    )

    report = validate_timetable_version(state, version)

    assert "split_block_not_synchronized" in error_codes(report)


def test_split_block_cannot_overlap_a_source_class_lesson():
    state, version = make_two_class_state()
    version.class_schedules["class-1"][0][0] = LessonCell(
        kind="split",
        split_block_id="split-geography-politics",
    )
    place_lesson(
        version,
        "class-2",
        0,
        0,
        "req-class2-math-same-teacher",
    )

    report = validate_timetable_version(state, version)

    assert "class_double_booked" in error_codes(report)


def test_weekly_subject_counts_are_exact():
    state, version = make_two_class_state()

    report = validate_timetable_version(state, version)

    assert "weekly_period_count" in error_codes(report)


def test_room_double_booking_is_reported():
    state, version = make_two_class_state()
    place_lesson(version, "class-1", 0, 0, "req-class1-math")
    place_lesson(
        version,
        "class-2",
        0,
        0,
        "req-class2-math-same-teacher",
    )

    report = validate_timetable_version(state, version)

    assert "room_double_booked" in error_codes(report)


def test_teacher_unavailability_is_reported():
    state, version = make_two_class_state()
    teacher = next(item for item in state.teachers if item.id == "teacher-li")
    teacher.weekly_unavailable_slots.append(Slot(weekday=2, period=1))
    place_lesson(version, "class-1", 2, 1, "req-class1-math")

    report = validate_timetable_version(state, version)

    assert "teacher_unavailable" in error_codes(report)


def test_unqualified_teacher_is_reported():
    state, version = make_two_class_state()
    teacher = next(item for item in state.teachers if item.id == "teacher-li")
    teacher.qualified_subject_ids.clear()

    report = validate_timetable_version(state, version)

    assert "unqualified_teacher" in error_codes(report)


def test_resource_index_stale_is_reported():
    state, version = make_two_class_state()
    place_lesson(version, "class-1", 0, 0, "req-class1-math")

    report = validate_timetable_version(state, version)

    assert "resource_index_stale" in error_codes(report)


def test_synchronized_split_block_count_is_exact():
    state, version = make_two_class_state()
    block = state.split_course_blocks[0]
    place_split(version, block, 0, 0)
    place_split(version, block, 1, 0)

    report = validate_timetable_version(state, version)

    assert "split_block_period_count" in error_codes(report)


def test_unknown_cell_reference_is_reported():
    state, version = make_two_class_state()
    place_lesson(version, "class-1", 0, 0, "req-missing")

    report = validate_timetable_version(state, version)

    assert "unknown_requirement" in error_codes(report)


def test_daily_subject_cap_is_reported():
    state, version = make_two_class_state()
    state.settings.max_daily_subject_periods = 1
    place_lesson(version, "class-1", 0, 0, "req-class1-chinese")
    place_lesson(version, "class-1", 0, 1, "req-class1-chinese")

    report = validate_timetable_version(state, version)

    assert "daily_subject_limit" in error_codes(report)


def test_broken_consecutive_requirement_is_reported():
    state, version = make_two_class_state()
    requirement = next(
        item
        for item in state.course_requirements
        if item.id == "req-class1-math"
    )
    requirement.consecutive_periods = 2
    place_lesson(version, "class-1", 0, 0, requirement.id)
    place_lesson(version, "class-1", 1, 0, requirement.id)

    report = validate_timetable_version(state, version)

    assert "consecutive_periods" in error_codes(report)


def test_class_schedule_shape_is_enforced():
    state, version = make_two_class_state()
    version.class_schedules["class-1"].pop()

    report = validate_timetable_version(state, version)

    assert "invalid_class_schedule_shape" in error_codes(report)


def test_rebuild_resource_indexes_derives_assignments_without_mutating_input():
    state, version = make_two_class_state()
    block = state.split_course_blocks[0]
    place_lesson(version, "class-1", 0, 0, "req-class1-math")
    place_split(version, block, 1, 1)

    rebuilt = rebuild_resource_indexes(state, version)

    assert version.teacher_schedules["teacher-li"][0][0] is None
    assert rebuilt.teacher_schedules["teacher-li"][0][0].target_id == (
        "req-class1-math"
    )
    assert rebuilt.room_schedules["room-302"][1][1].target_id == (
        "split-group-politics"
    )


def test_assert_valid_version_raises_with_structured_report():
    state, version = make_two_class_state()

    with pytest.raises(ScheduleValidationError) as caught:
        assert_valid_version(state, version)

    assert caught.value.report.valid is False


def test_catalog_accepts_the_factory_state():
    state, _ = make_two_class_state()

    report = validate_catalog(state)

    assert report.valid
