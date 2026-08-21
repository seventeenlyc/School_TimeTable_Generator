from datetime import date

from domain import LessonCell
from factories import (
    make_state_with_substitution_exception,
    make_two_class_state,
    make_versioned_state,
)
from schedule_service import (
    create_child_version,
    get_active_version,
    iter_school_dates,
    monday_of,
    resolve_day,
    resolve_week,
)


def test_school_dates_skip_sunday_only():
    dates = list(iter_school_dates(date(2026, 8, 21), date(2026, 8, 24)))

    assert dates == [date(2026, 8, 21), date(2026, 8, 22), date(2026, 8, 24)]
    assert monday_of(date(2026, 8, 23)) == date(2026, 8, 17)


def test_latest_effective_version_wins():
    state, first, second = make_versioned_state()

    assert get_active_version(state, date(2026, 9, 6)).id == first.id
    assert get_active_version(state, date(2026, 9, 7)).id == second.id
    assert [day.date for day in resolve_week(state, date(2026, 9, 7))] == [
        date(2026, 9, 7),
        date(2026, 9, 8),
        date(2026, 9, 9),
        date(2026, 9, 10),
        date(2026, 9, 11),
        date(2026, 9, 12),
    ]


def test_date_exception_replaces_teacher_without_mutating_version():
    state = make_state_with_substitution_exception()

    day = resolve_day(state, date(2026, 9, 8))

    assert day.teacher_for("req-class1-math", period=0) == "teacher-substitute"
    assert state.course_requirements[0].teacher_id == "teacher-original"
    assignment = state.timetable_versions[0].teacher_schedules[
        "teacher-original"
    ][1][0]
    assert assignment.target_id == "req-class1-math"


def test_sunday_resolves_to_an_empty_school_day():
    state, _ = make_two_class_state()

    day = resolve_day(state, date(2026, 9, 6))

    assert day.version_id is None
    assert day.class_schedules == {}


def test_create_child_version_preserves_parent_link():
    state, parent = make_two_class_state()
    schedules = parent.copy(deep=True).class_schedules
    schedules["class-1"][0][0] = LessonCell(
        kind="lesson",
        requirement_id="req-class1-math",
    )

    child = create_child_version(
        state,
        parent,
        name="Child version",
        effective_from=date(2026, 9, 7),
        class_schedules=schedules,
        source_change_event_id="event-1",
    )

    assert child.parent_version_id == parent.id
    assert child.source_change_event_id == "event-1"
    assert child.teacher_schedules["teacher-li"][0][0].target_id == (
        "req-class1-math"
    )
    assert parent.class_schedules["class-1"][0][0] is None
