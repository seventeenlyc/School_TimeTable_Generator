from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Dict, Iterable, List, Optional, Set, Tuple

from domain import (
    AppState,
    CellOverride,
    ChangeEvent,
    ChangeEventKind,
    ChangeOperation,
    ChangeProposal,
    CourseRequirement,
    DateException,
    ProposalScore,
    Teacher,
    TeacherSubstitution,
)
from schedule_service import NoActiveTimetable, iter_school_dates, resolve_day


@dataclass(frozen=True)
class AffectedOccurrence:
    date: date
    weekday: int
    period: int
    class_id: str
    is_split: bool
    split_block_id: Optional[str]
    group_index: Optional[int]
    subject_id: str
    teacher_id: str
    room_id: Optional[str]
    base_version_id: str


TeacherReservation = Tuple[str, date, int]
ClassSlot = Tuple[str, date, int]


def find_affected_occurrences(
    state: AppState,
    event: ChangeEvent,
) -> List[AffectedOccurrence]:
    """Return the real dated lessons taught by the event's teacher."""
    requirements = {item.id: item for item in state.course_requirements}
    blocks = {item.id: item for item in state.split_course_blocks}
    occurrences: List[AffectedOccurrence] = []
    seen_split_groups: Set[Tuple[date, int, str, int]] = set()

    for on_date, selected_periods in _event_dates_and_periods(event):
        if on_date.weekday() > 5:
            continue
        try:
            resolved = resolve_day(state, on_date)
        except NoActiveTimetable:
            continue
        if resolved.version_id is None:
            continue

        for class_id, lessons in resolved.class_schedules.items():
            periods = (
                range(len(lessons))
                if selected_periods is None
                else selected_periods
            )
            for period in periods:
                if period < 0 or period >= len(lessons):
                    continue
                lesson = lessons[period]
                if lesson is None:
                    continue

                if lesson.cell.kind == "lesson":
                    if not lesson.teacher_ids or lesson.teacher_ids[0] != event.teacher_id:
                        continue
                    requirement = requirements.get(lesson.target_ids[0])
                    if requirement is None:
                        continue
                    occurrences.append(
                        AffectedOccurrence(
                            date=on_date,
                            weekday=on_date.weekday(),
                            period=period,
                            class_id=class_id,
                            is_split=False,
                            split_block_id=None,
                            group_index=None,
                            subject_id=requirement.subject_id,
                            teacher_id=event.teacher_id,
                            room_id=requirement.room_id,
                            base_version_id=resolved.version_id,
                        )
                    )
                    continue

                block_id = lesson.cell.split_block_id
                block = blocks.get(block_id)
                if block is None:
                    continue
                for group_index, current_teacher_id in enumerate(lesson.teacher_ids):
                    if current_teacher_id != event.teacher_id:
                        continue
                    split_key = (on_date, period, block.id, group_index)
                    if split_key in seen_split_groups:
                        continue
                    seen_split_groups.add(split_key)
                    group = block.groups[group_index]
                    occurrences.append(
                        AffectedOccurrence(
                            date=on_date,
                            weekday=on_date.weekday(),
                            period=period,
                            class_id=block.source_class_ids[0],
                            is_split=True,
                            split_block_id=block.id,
                            group_index=group_index,
                            subject_id=group.subject_id,
                            teacher_id=event.teacher_id,
                            room_id=group.room_id,
                            base_version_id=resolved.version_id,
                        )
                    )

    return sorted(
        occurrences,
        key=lambda item: (
            item.date,
            item.period,
            item.class_id,
            item.split_block_id or "",
            -1 if item.group_index is None else item.group_index,
        ),
    )


def propose_direct_changes(
    state: AppState,
    event: ChangeEvent,
) -> Optional[ChangeProposal]:
    """Build a complete deterministic direct proposal without mutating state."""
    occurrences = find_affected_occurrences(state, event)
    if not occurrences:
        return None

    exceptions: Dict[date, DateException] = {}
    operations: List[ChangeOperation] = []
    reservations: Set[TeacherReservation] = set()
    used_class_slots: Set[ClassSlot] = set()
    affected_teachers: Set[str] = set()
    swap_count = 0
    substitution_count = 0
    slot_distance = 0

    for occurrence in occurrences:
        if event.kind == ChangeEventKind.BUSY:
            swap = _try_class_swap(
                state,
                event,
                occurrence,
                exceptions,
                reservations,
                used_class_slots,
            )
            if swap is not None:
                operation, other_teacher_id, distance = swap
                operations.append(operation)
                affected_teachers.update(
                    [occurrence.teacher_id, other_teacher_id]
                )
                swap_count += 1
                slot_distance += distance
                continue

        substitution = _try_substitution(
            state,
            event,
            occurrence,
            exceptions,
            reservations,
        )
        if substitution is None:
            return None
        operation, substitute_teacher_id = substitution
        operations.append(operation)
        affected_teachers.update(
            [occurrence.teacher_id, substitute_teacher_id]
        )
        substitution_count += 1

    if event.kind == ChangeEventKind.ABSENCE:
        strategy = "absence_same_slot_substitute"
        strategy_tier = 0
        explanation = "All affected lessons use qualified same-subject substitutes."
    elif swap_count:
        strategy = "busy_class_swap"
        strategy_tier = 1 if substitution_count else 0
        explanation = "Same-day class swaps are used before any required substitutions."
    else:
        strategy = "busy_same_slot_substitute"
        strategy_tier = 1
        explanation = "No safe same-day class swap exists; qualified substitutes are used."

    date_exceptions = [exceptions[key] for key in sorted(exceptions)]
    affected_classes = {
        class_id
        for operation in operations
        for class_id in operation.class_ids
    }
    changed_cells = sum(
        len(exception.cell_overrides) for exception in date_exceptions
    )
    return ChangeProposal(
        base_revision=state.revision,
        base_version_id=occurrences[0].base_version_id,
        event=event.copy(deep=True),
        strategy=strategy,
        explanation=explanation,
        score=ProposalScore(
            strategy_tier=strategy_tier,
            changed_cells=changed_cells,
            affected_classes=len(affected_classes),
            affected_teachers=len(affected_teachers),
            moved_split_blocks=0,
            slot_distance=slot_distance,
        ),
        operations=operations,
        date_exceptions=date_exceptions,
    )


def _event_dates_and_periods(
    event: ChangeEvent,
) -> Iterable[Tuple[date, Optional[List[int]]]]:
    if event.kind == ChangeEventKind.ABSENCE:
        assert event.start_date is not None and event.end_date is not None
        for on_date in iter_school_dates(event.start_date, event.end_date):
            yield on_date, None
        return

    by_date: Dict[date, Set[int]] = {}
    for slot in event.busy_slots:
        by_date.setdefault(slot.date, set()).add(slot.period)
    for on_date in sorted(by_date):
        yield on_date, sorted(by_date[on_date])


def _try_substitution(
    state: AppState,
    event: ChangeEvent,
    occurrence: AffectedOccurrence,
    exceptions: Dict[date, DateException],
    reservations: Set[TeacherReservation],
) -> Optional[Tuple[ChangeOperation, str]]:
    substitute = _first_available_substitute(
        state,
        event,
        occurrence,
        reservations,
    )
    if substitute is None:
        return None

    target_kind, target_id, class_ids = _occurrence_target(state, occurrence)
    exception = exceptions.setdefault(
        occurrence.date,
        DateException(date=occurrence.date),
    )
    exception.teacher_substitutions.append(
        TeacherSubstitution(
            date=occurrence.date,
            period=occurrence.period,
            target_kind=target_kind,
            target_id=target_id,
            original_teacher_id=occurrence.teacher_id,
            substitute_teacher_id=substitute.id,
        )
    )
    reservations.add((substitute.id, occurrence.date, occurrence.period))
    return (
        ChangeOperation(
            date=occurrence.date,
            period=occurrence.period,
            class_ids=class_ids,
            kind="substitute",
            before_label=occurrence.teacher_id,
            after_label=substitute.id,
        ),
        substitute.id,
    )


def _try_class_swap(
    state: AppState,
    event: ChangeEvent,
    occurrence: AffectedOccurrence,
    exceptions: Dict[date, DateException],
    reservations: Set[TeacherReservation],
    used_class_slots: Set[ClassSlot],
) -> Optional[Tuple[ChangeOperation, str, int]]:
    if occurrence.is_split:
        return None

    requirements = {item.id: item for item in state.course_requirements}
    try:
        resolved = resolve_day(state, occurrence.date)
    except NoActiveTimetable:
        return None
    row = resolved.class_schedules.get(occurrence.class_id)
    if row is None or occurrence.period >= len(row):
        return None
    affected_lesson = row[occurrence.period]
    if affected_lesson is None or affected_lesson.cell.kind != "lesson":
        return None
    affected_requirement = requirements.get(affected_lesson.target_ids[0])
    if (
        affected_requirement is None
        or affected_requirement.consecutive_periods != 1
        or affected_lesson.teacher_ids[0] != affected_requirement.teacher_id
        or (occurrence.class_id, occurrence.date, occurrence.period)
        in used_class_slots
    ):
        return None

    for other_period, other_lesson in enumerate(row):
        if other_period == occurrence.period or other_lesson is None:
            continue
        if other_lesson.cell.kind != "lesson":
            continue
        if (occurrence.class_id, occurrence.date, other_period) in used_class_slots:
            continue
        other_requirement = requirements.get(other_lesson.target_ids[0])
        if (
            other_requirement is None
            or other_requirement.consecutive_periods != 1
            or other_lesson.teacher_ids[0] != other_requirement.teacher_id
        ):
            continue
        other_teacher_id = other_lesson.teacher_ids[0]
        if other_teacher_id == occurrence.teacher_id:
            continue
        if not _teacher_is_available(
            state,
            event,
            occurrence.teacher_id,
            occurrence.date,
            other_period,
            reservations,
        ):
            continue
        if not _teacher_is_available(
            state,
            event,
            other_teacher_id,
            occurrence.date,
            occurrence.period,
            reservations,
        ):
            continue
        if not _room_is_available(
            state,
            occurrence.date,
            other_period,
            affected_requirement.room_id,
            {other_requirement.id},
        ):
            continue
        if not _room_is_available(
            state,
            occurrence.date,
            occurrence.period,
            other_requirement.room_id,
            {affected_requirement.id},
        ):
            continue

        exception = exceptions.setdefault(
            occurrence.date,
            DateException(date=occurrence.date),
        )
        exception.cell_overrides.extend(
            [
                CellOverride(
                    date=occurrence.date,
                    class_id=occurrence.class_id,
                    period=occurrence.period,
                    before=affected_lesson.cell.copy(deep=True),
                    after=other_lesson.cell.copy(deep=True),
                ),
                CellOverride(
                    date=occurrence.date,
                    class_id=occurrence.class_id,
                    period=other_period,
                    before=other_lesson.cell.copy(deep=True),
                    after=affected_lesson.cell.copy(deep=True),
                ),
            ]
        )
        used_class_slots.update(
            {
                (occurrence.class_id, occurrence.date, occurrence.period),
                (occurrence.class_id, occurrence.date, other_period),
            }
        )
        reservations.update(
            {
                (occurrence.teacher_id, occurrence.date, other_period),
                (other_teacher_id, occurrence.date, occurrence.period),
            }
        )
        return (
            ChangeOperation(
                date=occurrence.date,
                period=occurrence.period,
                class_ids=[occurrence.class_id],
                kind="swap",
                before_label=affected_requirement.id,
                after_label=other_requirement.id,
            ),
            other_teacher_id,
            abs(other_period - occurrence.period) * 2,
        )
    return None


def _first_available_substitute(
    state: AppState,
    event: ChangeEvent,
    occurrence: AffectedOccurrence,
    reservations: Set[TeacherReservation],
) -> Optional[Teacher]:
    for teacher in state.teachers:
        if teacher.id == occurrence.teacher_id:
            continue
        if occurrence.subject_id not in teacher.qualified_subject_ids:
            continue
        if _teacher_is_available(
            state,
            event,
            teacher.id,
            occurrence.date,
            occurrence.period,
            reservations,
        ):
            return teacher
    return None


def _teacher_is_available(
    state: AppState,
    event: ChangeEvent,
    teacher_id: str,
    on_date: date,
    period: int,
    reservations: Set[TeacherReservation],
) -> bool:
    if (teacher_id, on_date, period) in reservations:
        return False
    teacher = next(
        (item for item in state.teachers if item.id == teacher_id),
        None,
    )
    if teacher is None:
        return False
    if any(
        slot.weekday == on_date.weekday() and slot.period == period
        for slot in teacher.weekly_unavailable_slots
    ):
        return False
    if _teacher_is_blocked(state, event, teacher_id, on_date, period):
        return False
    try:
        resolved = resolve_day(state, on_date)
    except NoActiveTimetable:
        return False
    for lessons in resolved.class_schedules.values():
        if period >= len(lessons):
            continue
        lesson = lessons[period]
        if lesson is not None and teacher_id in lesson.teacher_ids:
            return False
    return True


def _teacher_is_blocked(
    state: AppState,
    current_event: ChangeEvent,
    teacher_id: str,
    on_date: date,
    period: int,
) -> bool:
    events = [
        current_event,
        *state.change_events,
        *(change.event for change in state.applied_changes),
    ]
    seen: Set[Tuple[str, str]] = set()
    for event in events:
        key = (event.id, event.kind.value)
        if key in seen:
            continue
        seen.add(key)
        if event.teacher_id != teacher_id:
            continue
        if event.kind == ChangeEventKind.ABSENCE:
            if (
                event.start_date is not None
                and event.end_date is not None
                and event.start_date <= on_date <= event.end_date
            ):
                return True
            continue
        if any(
            slot.date == on_date and slot.period == period
            for slot in event.busy_slots
        ):
            return True
    return False


def _room_is_available(
    state: AppState,
    on_date: date,
    period: int,
    room_id: Optional[str],
    ignored_target_ids: Set[str],
) -> bool:
    if room_id is None:
        return True
    try:
        resolved = resolve_day(state, on_date)
    except NoActiveTimetable:
        return False
    for lessons in resolved.class_schedules.values():
        if period >= len(lessons):
            continue
        lesson = lessons[period]
        if lesson is None or room_id not in lesson.room_ids:
            continue
        if ignored_target_ids.intersection(lesson.target_ids):
            continue
        return False
    return True


def _occurrence_target(
    state: AppState,
    occurrence: AffectedOccurrence,
) -> Tuple[str, str, List[str]]:
    if occurrence.is_split:
        block = next(
            item
            for item in state.split_course_blocks
            if item.id == occurrence.split_block_id
        )
        assert occurrence.group_index is not None
        return (
            "split_group",
            block.groups[occurrence.group_index].id,
            list(block.source_class_ids),
        )

    resolved = resolve_day(state, occurrence.date)
    lesson = resolved.class_schedules[occurrence.class_id][occurrence.period]
    if lesson is None or lesson.cell.kind != "lesson":
        raise LookupError("affected ordinary lesson no longer exists")
    return "requirement", lesson.target_ids[0], [occurrence.class_id]


def generate_proposals(state: AppState, event: ChangeEvent) -> List[ChangeProposal]:
    """Public Task 8 orchestration entry point."""
    from local_optimizer import generate_proposals as _generate_proposals

    return _generate_proposals(state, event)


def propose_changes(state: AppState, event: ChangeEvent) -> List[ChangeProposal]:
    """Compatibility alias used by the implementation plan and API layer."""
    return generate_proposals(state, event)
