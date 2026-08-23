import pytest

from domain import CourseRequirement, LessonCell, SchoolClass, Slot, Subject, Teacher
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


def test_chinese_is_limited_to_one_period_per_day_when_global_cap_is_two():
    state, version = make_two_class_state()
    state.settings.max_daily_subject_periods = 2
    place_lesson(version, "class-1", 0, 0, "req-class1-chinese")
    place_lesson(version, "class-1", 0, 1, "req-class1-chinese")

    report = validate_timetable_version(state, version)

    assert "daily_subject_limit" in error_codes(report)


def test_missing_daily_core_subject_is_reported():
    state, version = make_two_class_state()
    state.subjects.append(Subject(id="subject-english", name="英语"))
    state.teachers.append(
        Teacher(
            id="teacher-english",
            name="英语教师",
            qualified_subject_ids=["subject-english"],
            teaching_assignment_ids=["req-class1-english"],
        )
    )
    state.course_requirements.append(
        CourseRequirement(
            id="req-class1-english",
            class_id="class-1",
            subject_id="subject-english",
            teacher_id="teacher-english",
            periods_per_week=5,
        )
    )
    place_lesson(version, "class-1", 0, 0, "req-class1-chinese")
    place_lesson(version, "class-1", 0, 1, "req-class1-chinese")

    report = validate_timetable_version(state, version)

    assert "daily_required_subject_missing" in error_codes(report)


def test_elective_subject_is_limited_to_one_period_per_day():
    state, version = make_two_class_state()
    chinese = next(subject for subject in state.subjects if subject.id == "subject-chinese")
    chinese.name = "物理"
    place_lesson(version, "class-1", 0, 0, "req-class1-chinese")
    place_lesson(version, "class-1", 0, 1, "req-class1-chinese")

    report = validate_timetable_version(state, version)

    assert "elective_daily_subject_limit" in error_codes(report)


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


def test_catalog_allows_one_teacher_to_serve_more_than_two_classes():
    state, _ = make_two_class_state()
    state.classes.append(SchoolClass(id="class-3", name="Class 3"))
    teacher = next(t for t in state.teachers if t.id == "teacher-li")
    requirement = CourseRequirement(
        id="req-class3-math",
        class_id="class-3",
        subject_id="subject-math",
        teacher_id=teacher.id,
        periods_per_week=2,
    )
    state.course_requirements.append(requirement)
    teacher.teaching_assignment_ids.append(requirement.id)

    assert validate_catalog(state).valid


def test_catalog_rejects_duplicate_class_subject_with_same_teacher():
    state, _ = make_two_class_state()
    duplicate = state.course_requirements[0].copy(
        update={"id": "req-class1-math-copy"}
    )
    state.course_requirements.append(duplicate)
    next(t for t in state.teachers if t.id == duplicate.teacher_id).teaching_assignment_ids.append(duplicate.id)

    issue = next(
        e for e in validate_catalog(state).errors
        if e.code == "duplicate_course_requirement"
    )
    assert {"class-1", "subject-math", "req-class1-math", duplicate.id} <= set(issue.entity_ids)


def test_catalog_rejects_duplicate_class_subject_with_different_teachers():
    state, _ = make_two_class_state()
    other = next(t for t in state.teachers if t.id == "teacher-chen")
    other.qualified_subject_ids.append("subject-math")
    duplicate = state.course_requirements[0].copy(
        update={"id": "req-class1-math-other", "teacher_id": other.id}
    )
    state.course_requirements.append(duplicate)
    other.teaching_assignment_ids.append(duplicate.id)

    issue = next(
        e for e in validate_catalog(state).errors
        if e.code == "duplicate_course_requirement_teachers"
    )
    assert {"teacher-li", "teacher-chen", duplicate.id} <= set(issue.entity_ids)


def test_catalog_rejects_duplicate_fixed_slots():
    state, _ = make_two_class_state()
    state.course_requirements.append(
        CourseRequirement(
            id="req-meeting",
            class_id="class-1",
            subject_id="subject-chinese",
            teacher_id="teacher-li",
            periods_per_week=2,
            fixed_slots=[Slot(weekday=0, period=0), Slot(weekday=0, period=0)],
        )
    )

    report = validate_catalog(state)

    codes = error_codes(report)
    assert "duplicate_fixed_slot" in codes
    assert "fixed_slot_conflict" not in codes


def test_catalog_rejects_fixed_slots_exceeding_period_count():
    state, _ = make_two_class_state()
    state.course_requirements.append(
        CourseRequirement(
            id="req-meeting",
            class_id="class-1",
            subject_id="subject-chinese",
            teacher_id="teacher-li",
            periods_per_week=1,
            fixed_slots=[Slot(weekday=0, period=0), Slot(weekday=1, period=0)],
        )
    )

    report = validate_catalog(state)

    assert "fixed_slot_count" in error_codes(report)


def test_catalog_rejects_fixed_slots_incompatible_with_consecutive_rule():
    state, _ = make_two_class_state()
    state.course_requirements.append(
        CourseRequirement(
            id="req-meeting",
            class_id="class-1",
            subject_id="subject-chinese",
            teacher_id="teacher-li",
            periods_per_week=2,
            consecutive_periods=2,
            fixed_slots=[Slot(weekday=0, period=0), Slot(weekday=1, period=0)],
        )
    )

    report = validate_catalog(state)

    assert "fixed_slot_consecutive" in error_codes(report)


def test_catalog_rejects_fixed_slots_outside_configured_periods():
    state, _ = make_two_class_state()
    state.course_requirements.append(
        CourseRequirement(
            id="req-meeting",
            class_id="class-1",
            subject_id="subject-chinese",
            teacher_id="teacher-li",
            periods_per_week=1,
            fixed_slots=[Slot(weekday=0, period=5)],
        )
    )

    report = validate_catalog(state)

    assert "slot_out_of_range" in error_codes(report)


def test_catalog_rejects_fixed_slot_when_teacher_is_unavailable():
    state, _ = make_two_class_state()
    state.teachers[0].weekly_unavailable_slots = [Slot(weekday=0, period=0)]
    state.course_requirements.append(
        CourseRequirement(
            id="req-meeting",
            class_id="class-1",
            subject_id="subject-chinese",
            teacher_id=state.teachers[0].id,
            periods_per_week=1,
            fixed_slots=[Slot(weekday=0, period=0)],
        )
    )

    report = validate_catalog(state)

    assert "fixed_slot_unavailable" in error_codes(report)


def test_catalog_rejects_fixed_slot_collisions_across_classes_teachers_and_rooms():
    state, _ = make_two_class_state()
    state.course_requirements.extend(
        [
            CourseRequirement(
                id="req-class-collision-1",
                class_id="class-1",
                subject_id="subject-chinese",
                teacher_id="teacher-li",
                periods_per_week=1,
                fixed_slots=[Slot(weekday=0, period=0)],
            ),
            CourseRequirement(
                id="req-class-collision-2",
                class_id="class-1",
                subject_id="subject-math",
                teacher_id="teacher-wang",
                periods_per_week=1,
                fixed_slots=[Slot(weekday=0, period=0)],
            ),
            CourseRequirement(
                id="req-teacher-collision-1",
                class_id="class-1",
                subject_id="subject-chinese",
                teacher_id="teacher-li",
                periods_per_week=1,
                fixed_slots=[Slot(weekday=0, period=1)],
            ),
            CourseRequirement(
                id="req-teacher-collision-2",
                class_id="class-2",
                subject_id="subject-math",
                teacher_id="teacher-li",
                periods_per_week=1,
                fixed_slots=[Slot(weekday=0, period=1)],
            ),
            CourseRequirement(
                id="req-room-collision-1",
                class_id="class-1",
                subject_id="subject-music",
                teacher_id="teacher-wang",
                room_id="room-302",
                periods_per_week=1,
                fixed_slots=[Slot(weekday=1, period=0)],
            ),
            CourseRequirement(
                id="req-room-collision-2",
                class_id="class-2",
                subject_id="subject-music",
                teacher_id="teacher-zhang",
                room_id="room-302",
                periods_per_week=1,
                fixed_slots=[Slot(weekday=1, period=0)],
            ),
        ]
    )

    report = validate_catalog(state)
    codes = error_codes(report)

    assert "fixed_slot_conflict" in codes


def test_missing_fixed_slot_is_reported():
    state, version = make_two_class_state()
    req = next(r for r in state.course_requirements if r.id == "req-class1-math")
    req.fixed_slots = [Slot(weekday=0, period=0)]
    place_lesson(version, "class-1", 0, 1, "req-class1-math")

    report = validate_timetable_version(state, version)

    assert "missing_fixed_slot" in error_codes(report)


def test_split_daily_subject_limit_is_reported():
    state, version = make_two_class_state()
    state.settings.max_daily_subject_periods = 2
    block = state.split_course_blocks[0]
    place_split(version, block, 0, 0)
    place_split(version, block, 0, 1)

    report = validate_timetable_version(state, version)

    assert "split_daily_subject_limit" in error_codes(report)


def test_elective_limit_combines_normal_and_split_cells_in_validation():
    state, version = make_two_class_state()
    state.course_requirements.append(
        CourseRequirement(
            id="req-class1-geography-extra",
            class_id="class-1",
            subject_id="subject-geography",
            teacher_id="teacher-zhang",
            periods_per_week=1,
        )
    )
    next(
        teacher for teacher in state.teachers if teacher.id == "teacher-zhang"
    ).teaching_assignment_ids.append("req-class1-geography-extra")
    place_lesson(version, "class-1", 0, 0, "req-class1-geography-extra")
    place_split(version, state.split_course_blocks[0], 0, 1)

    report = validate_timetable_version(state, version)

    assert "elective_daily_subject_limit" in error_codes(report)


def test_self_study_in_first_period_is_reported():
    state, version = make_two_class_state()
    place_lesson(version, "class-1", 0, 1, "req-class1-math")

    report = validate_timetable_version(state, version)

    assert "self_study_first_period" in error_codes(report)


def test_consecutive_self_study_is_reported():
    state, version = make_two_class_state()
    place_lesson(version, "class-1", 0, 0, "req-class1-math")
    place_lesson(version, "class-1", 0, 3, "req-class1-chinese")

    report = validate_timetable_version(state, version)

    assert "self_study_consecutive" in error_codes(report)


def test_placeholder_class_is_exempt_from_self_study_rules():
    state, version = make_two_class_state()
    for index, school_class in enumerate(state.classes):
        school_class.name = f"【系统占位】走班来源{index + 1}"
    place_lesson(version, "class-1", 0, 1, "req-class1-math")

    report = validate_timetable_version(state, version)

    codes = error_codes(report)
    assert "self_study_first_period" not in codes
    assert "self_study_consecutive" not in codes


def test_isolated_self_study_is_not_reported_when_other_rules_hold():
    state, version = make_two_class_state()
    # Fill every slot except a single isolated non-first period slot
    # (class-1, weekday 0, period 2). Other rule violations are expected;
    # only the self-study placement codes must stay absent.
    class_one_ids = ["req-class1-math", "req-class1-chinese"]
    class_two_ids = ["req-class2-math-same-teacher", "req-class2-chinese"]
    block = state.split_course_blocks[0]
    for weekday in range(state.settings.working_days):
        for period in range(state.settings.periods_per_day):
            if weekday == 0 and period == 2:
                continue
            if period == 0:
                place_lesson(version, "class-1", weekday, period, class_one_ids[0])
                place_lesson(version, "class-2", weekday, period, class_two_ids[0])
            elif period == 1:
                place_lesson(version, "class-1", weekday, period, class_one_ids[1])
                place_lesson(version, "class-2", weekday, period, class_two_ids[1])
            else:
                place_split(version, block, weekday, period)

    report = validate_timetable_version(state, version)

    codes = error_codes(report)
    assert "self_study_first_period" not in codes
    assert "self_study_consecutive" not in codes
