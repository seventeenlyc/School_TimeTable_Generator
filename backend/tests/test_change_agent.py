from dataclasses import FrozenInstanceError, fields
from datetime import date

import pytest

from change_agent import (
    AffectedOccurrence,
    find_affected_occurrences,
    propose_direct_changes,
)
from domain import (
    AppState,
    ChangeEvent,
    ChangeEventKind,
    CourseRequirement,
    DateSlot,
    LessonCell,
    Room,
    SchoolClass,
    Settings,
    Slot,
    SplitCourseBlock,
    SplitCourseGroup,
    Subject,
    Teacher,
    TimetableVersion,
)


WORKING_DAYS = 6
PERIODS_PER_DAY = 4
TUESDAY = date(2026, 9, 8)


def _empty_schedule():
    return [
        [None for _ in range(PERIODS_PER_DAY)]
        for _ in range(WORKING_DAYS)
    ]


def _ordinary_state(*, consecutive_math=1, two_substitutes=False):
    requirements = [
        CourseRequirement(
            id="req-math",
            class_id="class-1",
            subject_id="subject-math",
            teacher_id="teacher-math",
            room_id="room-math",
            periods_per_week=2,
            consecutive_periods=consecutive_math,
        ),
        CourseRequirement(
            id="req-chinese",
            class_id="class-1",
            subject_id="subject-chinese",
            teacher_id="teacher-chinese",
            room_id="room-chinese",
            periods_per_week=1,
        ),
    ]
    teachers = [
        Teacher(
            id="teacher-math",
            name="Math teacher",
            qualified_subject_ids=["subject-math"],
            teaching_assignment_ids=["req-math"],
        ),
        Teacher(
            id="teacher-chinese",
            name="Chinese teacher",
            qualified_subject_ids=["subject-chinese"],
            teaching_assignment_ids=["req-chinese"],
        ),
        Teacher(
            id="teacher-sub-first",
            name="First substitute",
            qualified_subject_ids=["subject-math"],
        ),
    ]
    if two_substitutes:
        teachers.append(
            Teacher(
                id="teacher-sub-second",
                name="Second substitute",
                qualified_subject_ids=["subject-math"],
            )
        )

    version = TimetableVersion(
        id="version-base",
        name="Base",
        effective_from=date(2026, 9, 1),
        class_schedules={"class-1": _empty_schedule()},
    )
    version.class_schedules["class-1"][1][0] = LessonCell(
        kind="lesson", requirement_id="req-math"
    )
    version.class_schedules["class-1"][1][1] = LessonCell(
        kind="lesson", requirement_id="req-chinese"
    )
    version.class_schedules["class-1"][2][0] = LessonCell(
        kind="lesson", requirement_id="req-math"
    )

    state = AppState(
        revision=7,
        settings=Settings(periods_per_day=PERIODS_PER_DAY),
        teachers=teachers,
        classes=[SchoolClass(id="class-1", name="Class 1")],
        subjects=[
            Subject(id="subject-math", name="Math"),
            Subject(id="subject-chinese", name="Chinese"),
        ],
        rooms=[
            Room(id="room-math", name="Math room"),
            Room(id="room-chinese", name="Chinese room"),
        ],
        course_requirements=requirements,
        timetable_versions=[version],
    )
    return state


def _split_state():
    block = SplitCourseBlock(
        id="split-humanities",
        name="Humanities",
        source_class_ids=["class-1", "class-2"],
        periods_per_week=1,
        groups=[
            SplitCourseGroup(
                id="group-geography",
                subject_id="subject-geography",
                teacher_id="teacher-geography",
                room_id="room-geography",
            ),
            SplitCourseGroup(
                id="group-politics",
                subject_id="subject-politics",
                teacher_id="teacher-politics",
                room_id="room-politics",
            ),
        ],
    )
    version = TimetableVersion(
        id="version-split",
        name="Split base",
        effective_from=date(2026, 9, 1),
        class_schedules={
            "class-1": _empty_schedule(),
            "class-2": _empty_schedule(),
        },
    )
    for class_id in block.source_class_ids:
        version.class_schedules[class_id][1][0] = LessonCell(
            kind="split", split_block_id=block.id
        )
    return AppState(
        revision=3,
        settings=Settings(periods_per_day=PERIODS_PER_DAY),
        teachers=[
            Teacher(
                id="teacher-geography",
                name="Geography teacher",
                qualified_subject_ids=["subject-geography"],
            ),
            Teacher(
                id="teacher-politics",
                name="Politics teacher",
                qualified_subject_ids=["subject-politics"],
            ),
            Teacher(
                id="teacher-geography-sub",
                name="Geography substitute",
                qualified_subject_ids=["subject-geography"],
            ),
        ],
        classes=[
            SchoolClass(id="class-1", name="Class 1"),
            SchoolClass(id="class-2", name="Class 2"),
        ],
        subjects=[
            Subject(id="subject-geography", name="Geography"),
            Subject(id="subject-politics", name="Politics"),
        ],
        rooms=[
            Room(id="room-geography", name="Geography room"),
            Room(id="room-politics", name="Politics room"),
        ],
        split_course_blocks=[block],
        timetable_versions=[version],
    )


def _absence(teacher_id="teacher-math", start=TUESDAY, end=TUESDAY):
    return ChangeEvent(
        id="event-absence",
        kind=ChangeEventKind.ABSENCE,
        teacher_id=teacher_id,
        start_date=start,
        end_date=end,
    )


def _busy(period=0):
    return ChangeEvent(
        id="event-busy",
        kind=ChangeEventKind.BUSY,
        teacher_id="teacher-math",
        busy_slots=[DateSlot(date=TUESDAY, period=period)],
    )


def test_affected_occurrence_has_the_exact_immutable_structure():
    assert [field.name for field in fields(AffectedOccurrence)] == [
        "date",
        "weekday",
        "period",
        "class_id",
        "is_split",
        "split_block_id",
        "group_index",
        "subject_id",
        "teacher_id",
        "room_id",
        "base_version_id",
    ]
    occurrence = find_affected_occurrences(
        _ordinary_state(), _absence()
    )[0]
    with pytest.raises((FrozenInstanceError, AttributeError, TypeError)):
        occurrence.period = 2


def test_absence_finds_every_school_date_in_the_inclusive_range():
    state = _ordinary_state()
    occurrences = find_affected_occurrences(
        state,
        _absence(start=TUESDAY, end=date(2026, 9, 9)),
    )
    assert [(item.date, item.period) for item in occurrences] == [
        (date(2026, 9, 8), 0),
        (date(2026, 9, 9), 0),
    ]
    assert all(item.base_version_id == "version-base" for item in occurrences)


def test_busy_checks_only_the_explicit_date_slots():
    state = _ordinary_state()
    event = ChangeEvent(
        kind=ChangeEventKind.BUSY,
        teacher_id="teacher-math",
        busy_slots=[DateSlot(date=TUESDAY, period=0)],
    )
    occurrences = find_affected_occurrences(state, event)
    assert [(item.date, item.period) for item in occurrences] == [(TUESDAY, 0)]


def test_split_course_creates_one_occurrence_for_only_the_affected_group():
    state = _split_state()
    occurrences = find_affected_occurrences(
        state, _absence(teacher_id="teacher-geography")
    )
    assert len(occurrences) == 1
    assert occurrences[0] == AffectedOccurrence(
        date=TUESDAY,
        weekday=1,
        period=0,
        class_id="class-1",
        is_split=True,
        split_block_id="split-humanities",
        group_index=0,
        subject_id="subject-geography",
        teacher_id="teacher-geography",
        room_id="room-geography",
        base_version_id="version-split",
    )


def test_absence_uses_the_first_qualified_available_teacher_by_state_order():
    state = _ordinary_state(two_substitutes=True)
    proposal = propose_direct_changes(state, _absence())
    substitution = proposal.date_exceptions[0].teacher_substitutions[0]
    assert proposal.strategy == "absence_same_slot_substitute"
    assert proposal.base_revision == 7
    assert proposal.base_version_id == "version-base"
    assert substitution.substitute_teacher_id == "teacher-sub-first"


def test_busy_prefers_same_day_class_swap_over_available_substitution():
    proposal = propose_direct_changes(_ordinary_state(), _busy())
    assert proposal.strategy == "busy_class_swap"
    assert [operation.kind for operation in proposal.operations] == ["swap"]
    exception = proposal.date_exceptions[0]
    assert [(item.period, item.after.requirement_id) for item in exception.cell_overrides] == [
        (0, "req-chinese"),
        (1, "req-math"),
    ]
    assert exception.teacher_substitutions == []


def test_busy_falls_back_to_same_subject_substitution_when_swap_is_unsafe():
    state = _ordinary_state(consecutive_math=2)
    proposal = propose_direct_changes(state, _busy())
    assert proposal.strategy == "busy_same_slot_substitute"
    assert [operation.kind for operation in proposal.operations] == ["substitute"]
    assert (
        proposal.date_exceptions[0]
        .teacher_substitutions[0]
        .substitute_teacher_id
        == "teacher-sub-first"
    )


def test_direct_proposal_is_all_or_nothing_and_does_not_mutate_state():
    state = _ordinary_state()
    substitute = next(
        teacher for teacher in state.teachers if teacher.id == "teacher-sub-first"
    )
    substitute.weekly_unavailable_slots = [Slot(weekday=2, period=0)]
    before = state.json(sort_keys=True)

    proposal = propose_direct_changes(
        state,
        _absence(start=TUESDAY, end=date(2026, 9, 9)),
    )

    assert proposal is None
    assert state.json(sort_keys=True) == before


def test_split_substitution_changes_only_the_affected_group():
    state = _split_state()
    before = state.json(sort_keys=True)
    proposal = propose_direct_changes(
        state, _absence(teacher_id="teacher-geography")
    )
    exception = proposal.date_exceptions[0]
    assert exception.cell_overrides == []
    assert len(exception.teacher_substitutions) == 1
    assert exception.teacher_substitutions[0].target_kind == "split_group"
    assert exception.teacher_substitutions[0].target_id == "group-geography"
    assert state.json(sort_keys=True) == before
