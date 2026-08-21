from datetime import date

from change_agent import AffectedOccurrence, find_affected_occurrences
from domain import (
    AppState,
    ChangeEvent,
    ChangeEventKind,
    ChangeOperation,
    CourseRequirement,
    DateSlot,
    LessonCell,
    SchoolClass,
    Settings,
    Subject,
    Teacher,
    TimetableVersion,
)
from local_optimizer import generate_proposals, score_proposal, solve_local_reschedule


TUESDAY = date(2026, 9, 8)


def _empty_schedule(periods=4):
    return [[None for _ in range(periods)] for _ in range(6)]


def _operation(kind):
    return ChangeOperation(
        date=TUESDAY,
        period=0,
        class_ids=["class-1"],
        kind=kind,
        before_label="before",
        after_label="after",
    )


def _reschedule_state(*, long_absence=False):
    requirements = [
        CourseRequirement(
            id="req-math",
            class_id="class-1",
            subject_id="subject-math",
            teacher_id="teacher-absent",
            periods_per_week=1,
        ),
        CourseRequirement(
            id="req-science",
            class_id="class-1",
            subject_id="subject-science",
            teacher_id="teacher-science",
            periods_per_week=1,
        ),
        CourseRequirement(
            id="req-class2",
            class_id="class-2",
            subject_id="subject-science",
            teacher_id="teacher-substitute",
            periods_per_week=1,
        ),
    ]
    version = TimetableVersion(
        id="version-base",
        name="Base timetable",
        effective_from=date(2026, 9, 1),
        class_schedules={
            "class-1": _empty_schedule(),
            "class-2": _empty_schedule(),
        },
    )
    version.class_schedules["class-1"][1][0] = LessonCell(
        kind="lesson", requirement_id="req-math"
    )
    version.class_schedules["class-1"][1][1] = LessonCell(
        kind="lesson", requirement_id="req-science"
    )
    version.class_schedules["class-2"][1][0] = LessonCell(
        kind="lesson", requirement_id="req-class2"
    )
    state = AppState(
        revision=4,
        settings=Settings(periods_per_day=4, long_absence_days=28),
        teachers=[
            Teacher(
                id="teacher-absent",
                name="Absent",
                qualified_subject_ids=["subject-math"],
                teaching_assignment_ids=["req-math"],
            ),
            Teacher(
                id="teacher-substitute",
                name="Math substitute",
                qualified_subject_ids=["subject-math", "subject-science"],
                teaching_assignment_ids=["req-class2"],
            ),
            Teacher(
                id="teacher-science",
                name="Science",
                qualified_subject_ids=["subject-science"],
                teaching_assignment_ids=["req-science"],
            ),
        ],
        classes=[
            SchoolClass(id="class-1", name="Class 1"),
            SchoolClass(id="class-2", name="Class 2"),
        ],
        subjects=[
            Subject(id="subject-math", name="Math"),
            Subject(id="subject-science", name="Science"),
        ],
        course_requirements=requirements,
        timetable_versions=[version],
    )
    event = ChangeEvent(
        id="event-absence",
        kind=ChangeEventKind.ABSENCE,
        teacher_id="teacher-absent",
        start_date=TUESDAY,
        end_date=date(2026, 10, 5) if long_absence else TUESDAY,
    )
    return state, event


def test_busy_prefers_in_class_swap_over_substitution():
    swap = score_proposal([_operation("swap")], "direct_swap", 1, False, False, False)
    substitute = score_proposal(
        [_operation("substitute")], "direct_substitution", 1, False, False, False
    )
    assert swap.total_score > substitute.total_score


def test_absence_prefers_same_subject_substitution_over_swap():
    substitute = score_proposal(
        [_operation("substitute")], "direct_substitution", 1, False, False, True
    )
    swap = score_proposal([_operation("swap")], "direct_swap", 1, False, False, True)
    assert substitute.total_score > swap.total_score


def test_split_course_strongly_prefers_substitution_to_breaking_sync():
    intact = score_proposal(
        [_operation("substitute")], "direct_substitution", 2, False, False, True
    )
    broken = score_proposal(
        [_operation("move_split_block")], "cp_sat_local", 2, True, False, True
    )
    assert intact.total_score - broken.total_score >= 50


def test_local_optimizer_uses_the_minimum_two_cell_swap():
    state, event = _reschedule_state()
    affected = find_affected_occurrences(state, event)

    proposal = solve_local_reschedule(state, event, affected, max_changes=3)

    assert proposal is not None
    assert proposal.strategy == "cp_sat_local"
    assert proposal.score.changed_cells == 2
    assert [item.kind for item in proposal.operations] == ["swap"]
    overrides = proposal.date_exceptions[0].cell_overrides
    assert [(item.period, item.after.requirement_id) for item in overrides] == [
        (0, "req-science"),
        (1, "req-math"),
    ]
    assert proposal.date_exceptions[0].teacher_substitutions[0].period == 1


def test_long_absence_generates_one_persistent_version_without_auto_rollback():
    state, event = _reschedule_state(long_absence=True)
    before = state.json(sort_keys=True)

    proposals = generate_proposals(state, event)

    assert proposals
    candidate = proposals[0].version_candidate
    assert candidate is not None
    assert candidate.effective_from == date(2026, 9, 14)
    assert candidate.parent_version_id == "version-base"
    assert candidate.source_change_event_id == event.id
    assert candidate.class_schedules["class-1"][1][0].requirement_id == "req-science"
    moved_math = candidate.class_schedules["class-1"][1][1]
    assert moved_math.requirement_id == "req-math"
    assert next(
        item for item in state.course_requirements if item.id == moved_math.requirement_id
    ).teacher_id == event.teacher_id
    assert state.json(sort_keys=True) == before


def test_generate_proposals_sorts_candidates_by_total_score():
    state, _ = _reschedule_state()
    event = ChangeEvent(
        kind=ChangeEventKind.BUSY,
        teacher_id="teacher-absent",
        busy_slots=[DateSlot(date=TUESDAY, period=0)],
    )
    proposals = generate_proposals(state, event)
    assert proposals
    assert [item.score.total_score for item in proposals] == sorted(
        (item.score.total_score for item in proposals), reverse=True
    )
