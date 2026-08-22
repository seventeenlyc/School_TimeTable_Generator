from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, replace
from datetime import date, timedelta
from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple

from ortools.sat.python import cp_model

from change_agent import (
    AffectedOccurrence,
    _occurrence_target,
    _teacher_is_blocked,
    find_affected_occurrences,
    propose_direct_changes,
)
from domain import (
    AppState,
    CellOverride,
    ChangeEvent,
    ChangeEventKind,
    ChangeOperation,
    ChangeProposal,
    DateException,
    LessonCell,
    ProposalScore,
    TeacherSubstitution,
    TimetableVersion,
)
from schedule_service import (
    NoActiveTimetable,
    create_child_version,
    get_active_version,
    iter_school_dates,
    monday_of,
    resolve_day,
)


class ScoredProposalScore(ProposalScore):
    """Backward-compatible score with the Task 8 scalar ranking value."""

    total_score: int


@dataclass(frozen=True)
class _Action:
    occurrence: AffectedOccurrence
    strategy_cost: int
    operation: ChangeOperation
    overrides: Tuple[CellOverride, ...]
    substitution: Optional[TeacherSubstitution]
    touched_slots: frozenset[Tuple[str, date, int]]
    teacher_slots: frozenset[Tuple[str, date, int]]
    room_slots: frozenset[Tuple[str, date, int]]
    changed_cells: int
    moved_changes: int
    moved_split_blocks: int
    slot_distance: int


def _actions_conflict(left: _Action, right: _Action) -> bool:
    return bool(
        left.touched_slots.intersection(right.touched_slots)
        or left.teacher_slots.intersection(right.teacher_slots)
        or left.room_slots.intersection(right.room_slots)
    )


def score_proposal(
    operations: Sequence[ChangeOperation],
    strategy: str,
    affected_count: int,
    was_split_broken: bool,
    is_long_term: bool,
    is_absence: bool,
) -> ProposalScore:
    """Score one proposal while preserving event-specific hard priorities."""
    normalized = strategy.lower()
    if "cp_sat" in normalized or "local" in normalized or "reschedule" in normalized:
        strategy_kind = "cp_sat_local"
    elif "swap" in normalized:
        strategy_kind = "direct_swap"
    else:
        strategy_kind = "direct_substitution"

    if is_absence:
        bases = {
            "direct_substitution": 105,
            "direct_swap": 90,
            "cp_sat_local": 70,
        }
        tiers = {"direct_substitution": 0, "direct_swap": 1, "cp_sat_local": 2}
    else:
        bases = {
            "direct_swap": 100,
            "direct_substitution": 95,
            "cp_sat_local": 70,
        }
        tiers = {"direct_swap": 0, "direct_substitution": 1, "cp_sat_local": 2}

    changed_cells = sum(2 for item in operations if item.kind != "substitute")
    affected_classes = {
        class_id for item in operations for class_id in item.class_ids
    }
    moved_split_blocks = sum(item.kind == "move_split_block" for item in operations)
    operation_penalty = 2 * len(operations)
    total = bases[strategy_kind] - operation_penalty - max(0, affected_count)
    if was_split_broken:
        total -= 50
    if is_long_term:
        total += 10

    return ScoredProposalScore(
        strategy_tier=tiers[strategy_kind],
        changed_cells=changed_cells,
        affected_classes=len(affected_classes),
        affected_teachers=2 * len(operations),
        moved_split_blocks=moved_split_blocks,
        slot_distance=0,
        total_score=total,
    )


def solve_local_reschedule(
    state: AppState,
    event: ChangeEvent,
    affected_occurrences: Sequence[AffectedOccurrence],
    max_changes: int = 3,
) -> Optional[ChangeProposal]:
    """Find a complete, minimum-disturbance local repair with CP-SAT."""
    if not affected_occurrences or max_changes < 0:
        return None

    long_term = _is_long_term(state, event)
    occurrences = _weekly_representatives(state, event, affected_occurrences)
    actions_by_occurrence: List[List[_Action]] = []
    for occurrence in occurrences:
        actions = _candidate_actions(state, event, occurrence, long_term)
        if not actions:
            return None
        actions_by_occurrence.append(actions)

    model = cp_model.CpModel()
    variables: Dict[Tuple[int, int], cp_model.IntVar] = {}
    for occurrence_index, actions in enumerate(actions_by_occurrence):
        group = []
        for action_index, _ in enumerate(actions):
            variable = model.NewBoolVar(f"action_{occurrence_index}_{action_index}")
            variables[(occurrence_index, action_index)] = variable
            group.append(variable)
        model.Add(sum(group) == 1)

    flat = [
        (occurrence_index, action_index, action)
        for occurrence_index, actions in enumerate(actions_by_occurrence)
        for action_index, action in enumerate(actions)
    ]
    for left_index, (left_occurrence, left_action, left) in enumerate(flat):
        for right_occurrence, right_action, right in flat[left_index + 1 :]:
            if left_occurrence == right_occurrence:
                continue
            if _actions_conflict(left, right):
                model.Add(
                    variables[(left_occurrence, left_action)]
                    + variables[(right_occurrence, right_action)]
                    <= 1
                )

    moved_expression = sum(
        action.moved_changes * variables[(occurrence_index, action_index)]
        for occurrence_index, action_index, action in flat
    )
    model.Add(moved_expression <= max_changes)
    objectives = [
        sum(
            action.strategy_cost * variables[(occurrence_index, action_index)]
            for occurrence_index, action_index, action in flat
        ),
        sum(
            action.changed_cells * variables[(occurrence_index, action_index)]
            for occurrence_index, action_index, action in flat
        ),
        sum(
            action.moved_split_blocks * variables[(occurrence_index, action_index)]
            for occurrence_index, action_index, action in flat
        ),
        sum(
            action.slot_distance * variables[(occurrence_index, action_index)]
            for occurrence_index, action_index, action in flat
        ),
    ]
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 10.0
    solver.parameters.random_seed = 20260821
    solver.parameters.num_search_workers = 1
    status = _solve_lexicographically(model, solver, objectives)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return None

    selected = [
        action
        for occurrence_index, action_index, action in flat
        if solver.Value(variables[(occurrence_index, action_index)])
    ]
    proposal = _actions_to_proposal(state, event, selected, long_term)
    if long_term and any(action.moved_changes for action in selected):
        proposal.version_candidate = _make_version_candidate(state, event, selected)
        proposal.date_exceptions = _long_term_exceptions(state, event, selected)
    return proposal


def generate_proposals(state: AppState, event: ChangeEvent) -> List[ChangeProposal]:
    """Return complete direct or locally optimized proposals, best first."""
    occurrences = find_affected_occurrences(state, event)
    if not occurrences:
        return []
    long_term = _is_long_term(state, event)
    direct = propose_direct_changes(state, event)
    if direct is not None:
        _rescore(direct, occurrences, long_term)
        return [direct]

    local = solve_local_reschedule(state, event, occurrences)
    proposals = [local] if local is not None else []
    return sorted(proposals, key=lambda item: item.score.total_score, reverse=True)


def proposal_sort_key(proposal: ChangeProposal):
    score = proposal.score
    return (
        score.strategy_tier,
        score.changed_cells,
        score.affected_classes,
        score.affected_teachers,
        score.moved_split_blocks,
        score.slot_distance,
    )


def _solve_lexicographically(model, solver, objectives):
    status = cp_model.UNKNOWN
    for expression in objectives:
        model.Minimize(expression)
        status = solver.Solve(model)
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return status
        model.Add(expression == solver.Value(expression))
    return status


def _candidate_actions(
    state: AppState,
    event: ChangeEvent,
    occurrence: AffectedOccurrence,
    long_term: bool,
) -> List[_Action]:
    actions = _direct_substitution_actions(state, event, occurrence)
    if occurrence.is_split:
        actions.extend(_split_move_actions(state, event, occurrence, long_term))
    else:
        actions.extend(_ordinary_move_actions(state, event, occurrence, long_term))
    return actions


def _direct_substitution_actions(
    state: AppState,
    event: ChangeEvent,
    occurrence: AffectedOccurrence,
) -> List[_Action]:
    target_kind, target_id, class_ids = _occurrence_target(state, occurrence)
    actions = []
    for teacher_id in _qualified_teacher_ids(state, occurrence):
        if not _teacher_available(
            state, event, teacher_id, occurrence.date, occurrence.period, {target_id}
        ):
            continue
        substitution = TeacherSubstitution(
            date=occurrence.date,
            period=occurrence.period,
            target_kind=target_kind,
            target_id=target_id,
            original_teacher_id=occurrence.teacher_id,
            substitute_teacher_id=teacher_id,
        )
        operation = ChangeOperation(
            date=occurrence.date,
            period=occurrence.period,
            class_ids=class_ids,
            kind="substitute",
            before_label=occurrence.teacher_id,
            after_label=teacher_id,
        )
        actions.append(
            _Action(
                occurrence=occurrence,
                strategy_cost=0 if event.kind == ChangeEventKind.ABSENCE else 1,
                operation=operation,
                overrides=(),
                substitution=substitution,
                touched_slots=frozenset(),
                teacher_slots=frozenset({(teacher_id, occurrence.date, occurrence.period)}),
                room_slots=frozenset(),
                changed_cells=0,
                moved_changes=0,
                moved_split_blocks=0,
                slot_distance=0,
            )
        )
    return actions


def _ordinary_move_actions(
    state: AppState,
    event: ChangeEvent,
    occurrence: AffectedOccurrence,
    long_term: bool,
) -> List[_Action]:
    try:
        source_day = resolve_day(state, occurrence.date)
    except NoActiveTimetable:
        return []
    source_lesson = source_day.class_schedules[occurrence.class_id][occurrence.period]
    if source_lesson is None or source_lesson.cell.kind != "lesson":
        return []
    source_cell = source_lesson.cell.copy(deep=True)
    source_target = source_lesson.target_ids[0]
    monday = monday_of(occurrence.date)
    actions: List[_Action] = []

    for day_offset in range(state.settings.working_days):
        destination_date = monday + timedelta(days=day_offset)
        try:
            destination_day = resolve_day(state, destination_date)
        except NoActiveTimetable:
            continue
        row = destination_day.class_schedules.get(occurrence.class_id)
        if row is None:
            continue
        for destination_period, destination_lesson in enumerate(row):
            if destination_date == occurrence.date and destination_period == occurrence.period:
                continue
            if destination_lesson is not None and destination_lesson.cell.kind != "lesson":
                continue
            destination_target = (
                destination_lesson.target_ids[0] if destination_lesson is not None else None
            )
            ignored_targets = {source_target}
            if destination_target is not None:
                ignored_targets.add(destination_target)

            if event.kind == ChangeEventKind.ABSENCE:
                replacement_ids = _qualified_teacher_ids(state, occurrence)
            else:
                replacement_ids = [occurrence.teacher_id]
            for replacement_id in replacement_ids:
                if not _teacher_available(
                    state,
                    event,
                    replacement_id,
                    destination_date,
                    destination_period,
                    ignored_targets,
                ):
                    continue
                if long_term and not _teacher_available_after_recovery(
                    state,
                    event,
                    occurrence.teacher_id,
                    destination_date,
                    destination_period,
                    ignored_targets,
                ):
                    continue
                if occurrence.room_id and not _room_available(
                    state,
                    occurrence.room_id,
                    destination_date,
                    destination_period,
                    ignored_targets,
                ):
                    continue

                teacher_slots = {(replacement_id, destination_date, destination_period)}
                room_slots: Set[Tuple[str, date, int]] = set()
                if occurrence.room_id:
                    room_slots.add((occurrence.room_id, destination_date, destination_period))
                destination_cell = None
                if destination_lesson is not None:
                    destination_cell = destination_lesson.cell.copy(deep=True)
                    other_teacher_id = destination_lesson.teacher_ids[0]
                    other_room_id = destination_lesson.room_ids[0] if destination_lesson.room_ids else None
                    if not _teacher_available(
                        state,
                        event,
                        other_teacher_id,
                        occurrence.date,
                        occurrence.period,
                        ignored_targets,
                    ):
                        continue
                    if other_room_id and not _room_available(
                        state,
                        other_room_id,
                        occurrence.date,
                        occurrence.period,
                        ignored_targets,
                    ):
                        continue
                    teacher_slots.add((other_teacher_id, occurrence.date, occurrence.period))
                    if other_room_id:
                        room_slots.add((other_room_id, occurrence.date, occurrence.period))

                overrides = (
                    CellOverride(
                        date=occurrence.date,
                        class_id=occurrence.class_id,
                        period=occurrence.period,
                        before=source_cell.copy(deep=True),
                        after=destination_cell.copy(deep=True) if destination_cell else None,
                    ),
                    CellOverride(
                        date=destination_date,
                        class_id=occurrence.class_id,
                        period=destination_period,
                        before=destination_cell.copy(deep=True) if destination_cell else None,
                        after=source_cell.copy(deep=True),
                    ),
                )
                substitution = None
                if replacement_id != occurrence.teacher_id:
                    substitution = TeacherSubstitution(
                        date=destination_date,
                        period=destination_period,
                        target_kind="requirement",
                        target_id=source_target,
                        original_teacher_id=occurrence.teacher_id,
                        substitute_teacher_id=replacement_id,
                    )
                operation = ChangeOperation(
                    date=occurrence.date,
                    period=occurrence.period,
                    class_ids=[occurrence.class_id],
                    kind="swap",
                    before_label=source_target,
                    after_label=destination_target or "empty",
                )
                actions.append(
                    _Action(
                        occurrence=occurrence,
                        strategy_cost=1 if event.kind == ChangeEventKind.ABSENCE else 0,
                        operation=operation,
                        overrides=overrides,
                        substitution=substitution,
                        touched_slots=frozenset(
                            {
                                (occurrence.class_id, occurrence.date, occurrence.period),
                                (occurrence.class_id, destination_date, destination_period),
                            }
                        ),
                        teacher_slots=frozenset(teacher_slots),
                        room_slots=frozenset(room_slots),
                        changed_cells=2,
                        moved_changes=1,
                        moved_split_blocks=0,
                        slot_distance=(
                            abs(destination_date.weekday() - occurrence.weekday)
                            * state.settings.periods_per_day
                            + abs(destination_period - occurrence.period)
                        ),
                    )
                )
    return actions


def _split_move_actions(
    state: AppState,
    event: ChangeEvent,
    occurrence: AffectedOccurrence,
    long_term: bool,
) -> List[_Action]:
    block = next(
        item for item in state.split_course_blocks if item.id == occurrence.split_block_id
    )
    source_cell = LessonCell(kind="split", split_block_id=block.id)
    assert occurrence.group_index is not None
    affected_group = block.groups[occurrence.group_index]
    group_target_ids = {group.id for group in block.groups}
    monday = monday_of(occurrence.date)
    actions: List[_Action] = []
    for day_offset in range(state.settings.working_days):
        destination_date = monday + timedelta(days=day_offset)
        try:
            resolved = resolve_day(state, destination_date)
        except NoActiveTimetable:
            continue
        for destination_period in range(state.settings.periods_per_day):
            if destination_date == occurrence.date and destination_period == occurrence.period:
                continue
            if any(
                resolved.class_schedules[class_id][destination_period] is not None
                for class_id in block.source_class_ids
            ):
                continue
            for replacement_id in _qualified_teacher_ids(state, occurrence):
                teacher_slots: Set[Tuple[str, date, int]] = set()
                room_slots: Set[Tuple[str, date, int]] = set()
                feasible = True
                for index, group in enumerate(block.groups):
                    teacher_id = replacement_id if index == occurrence.group_index else group.teacher_id
                    if not _teacher_available(
                        state,
                        event,
                        teacher_id,
                        destination_date,
                        destination_period,
                        group_target_ids,
                    ) or not _room_available(
                        state,
                        group.room_id,
                        destination_date,
                        destination_period,
                        group_target_ids,
                    ):
                        feasible = False
                        break
                    teacher_slots.add((teacher_id, destination_date, destination_period))
                    if group.room_id:
                        room_slots.add((group.room_id, destination_date, destination_period))
                if not feasible:
                    continue
                if long_term and not _teacher_available_after_recovery(
                    state,
                    event,
                    occurrence.teacher_id,
                    destination_date,
                    destination_period,
                    group_target_ids,
                ):
                    continue
                overrides = []
                touched = set()
                for class_id in block.source_class_ids:
                    overrides.extend(
                        [
                            CellOverride(
                                date=occurrence.date,
                                class_id=class_id,
                                period=occurrence.period,
                                before=source_cell.copy(deep=True),
                                after=None,
                            ),
                            CellOverride(
                                date=destination_date,
                                class_id=class_id,
                                period=destination_period,
                                before=None,
                                after=source_cell.copy(deep=True),
                            ),
                        ]
                    )
                    touched.update(
                        {
                            (class_id, occurrence.date, occurrence.period),
                            (class_id, destination_date, destination_period),
                        }
                    )
                actions.append(
                    _Action(
                        occurrence=occurrence,
                        strategy_cost=1,
                        operation=ChangeOperation(
                            date=occurrence.date,
                            period=occurrence.period,
                            class_ids=list(block.source_class_ids),
                            kind="move_split_block",
                            before_label=block.id,
                            after_label=f"weekday-{destination_date.weekday()}-period-{destination_period}",
                        ),
                        overrides=tuple(overrides),
                        substitution=TeacherSubstitution(
                            date=destination_date,
                            period=destination_period,
                            target_kind="split_group",
                            target_id=affected_group.id,
                            original_teacher_id=occurrence.teacher_id,
                            substitute_teacher_id=replacement_id,
                        ),
                        touched_slots=frozenset(touched),
                        teacher_slots=frozenset(teacher_slots),
                        room_slots=frozenset(room_slots),
                        changed_cells=len(overrides),
                        moved_changes=1,
                        moved_split_blocks=1,
                        slot_distance=(
                            abs(destination_date.weekday() - occurrence.weekday)
                            * state.settings.periods_per_day
                            + abs(destination_period - occurrence.period)
                        ),
                    )
                )
    return actions


def _actions_to_proposal(
    state: AppState,
    event: ChangeEvent,
    actions: Sequence[_Action],
    long_term: bool,
) -> ChangeProposal:
    exceptions: Dict[date, DateException] = {}
    for action in actions:
        for override in action.overrides:
            exceptions.setdefault(override.date, DateException(date=override.date)).cell_overrides.append(
                override.copy(deep=True)
            )
        if action.substitution is not None:
            substitution = action.substitution
            exceptions.setdefault(
                substitution.date, DateException(date=substitution.date)
            ).teacher_substitutions.append(substitution.copy(deep=True))

    base_version_id = actions[0].occurrence.base_version_id
    proposal = ChangeProposal(
        base_revision=state.revision,
        base_version_id=base_version_id,
        event=event.copy(deep=True),
        strategy="cp_sat_local",
        explanation="CP-SAT selected a complete minimum-disturbance local reschedule.",
        score=score_proposal(
            [action.operation for action in actions],
            "cp_sat_local",
            len(actions),
            any(action.moved_split_blocks for action in actions),
            long_term,
            event.kind == ChangeEventKind.ABSENCE,
        ),
        operations=[action.operation.copy(deep=True) for action in actions],
        date_exceptions=[exceptions[key] for key in sorted(exceptions)],
    )
    score = proposal.score
    score.changed_cells = sum(action.changed_cells for action in actions)
    score.affected_classes = len(
        {class_id for action in actions for class_id in action.operation.class_ids}
    )
    score.affected_teachers = len(
        {
            teacher_id
            for action in actions
            for teacher_id, _, _ in action.teacher_slots
        }
        | {action.occurrence.teacher_id for action in actions}
    )
    score.moved_split_blocks = sum(action.moved_split_blocks for action in actions)
    score.slot_distance = sum(action.slot_distance for action in actions)
    return proposal


def _make_version_candidate(
    state: AppState,
    event: ChangeEvent,
    actions: Sequence[_Action],
) -> TimetableVersion:
    assert event.start_date is not None
    effective_from = _long_version_start(event.start_date)
    parent = get_active_version(state, effective_from)
    schedules = {
        class_id: [
            [cell.copy(deep=True) if cell is not None else None for cell in day]
            for day in schedule
        ]
        for class_id, schedule in parent.class_schedules.items()
    }
    applied: Set[Tuple[str, int, int]] = set()
    for action in actions:
        for override in action.overrides:
            key = (override.class_id, override.date.weekday(), override.period)
            if key in applied:
                continue
            schedules[override.class_id][override.date.weekday()][override.period] = (
                override.after.copy(deep=True) if override.after is not None else None
            )
            applied.add(key)
    return create_child_version(
        state,
        parent,
        name=f"Long absence: {event.teacher_id}",
        effective_from=effective_from,
        class_schedules=schedules,
        source_change_event_id=event.id,
    )


def _long_term_exceptions(
    state: AppState,
    event: ChangeEvent,
    actions: Sequence[_Action],
) -> List[DateException]:
    assert event.start_date is not None and event.end_date is not None
    effective_from = _long_version_start(event.start_date)
    exceptions: Dict[date, DateException] = {}
    for action in actions:
        source_weekday = action.occurrence.weekday
        destination_override = next(
            (
                item
                for item in action.overrides
                if item.after is not None
                and (
                    item.after.requirement_id is not None
                    or item.after.split_block_id == action.occurrence.split_block_id
                )
                and item.date != action.occurrence.date
            ),
            None,
        )
        if destination_override is None and action.substitution is not None:
            destination_weekday = action.substitution.date.weekday()
            destination_period = action.substitution.period
        elif destination_override is not None:
            destination_weekday = destination_override.date.weekday()
            destination_period = destination_override.period
        else:
            destination_weekday = source_weekday
            destination_period = action.occurrence.period

        if action.moved_changes:
            for on_date in iter_school_dates(event.start_date, min(event.end_date, effective_from - timedelta(days=1))):
                if on_date.weekday() != source_weekday:
                    continue
                week_delta = on_date - action.occurrence.date
                for override in action.overrides:
                    mapped_date = override.date + week_delta
                    mapped = override.copy(deep=True, update={"date": mapped_date})
                    exceptions.setdefault(mapped_date, DateException(date=mapped_date)).cell_overrides.append(mapped)

        if action.substitution is not None:
            substitution = action.substitution
            for on_date in iter_school_dates(event.start_date, event.end_date):
                if on_date.weekday() != destination_weekday:
                    continue
                mapped = substitution.copy(
                    deep=True,
                    update={"date": on_date, "period": destination_period},
                )
                exceptions.setdefault(on_date, DateException(date=on_date)).teacher_substitutions.append(mapped)
    return [exceptions[key] for key in sorted(exceptions)]


def _weekly_representatives(
    state: AppState,
    event: ChangeEvent,
    occurrences: Sequence[AffectedOccurrence],
) -> List[AffectedOccurrence]:
    if not _is_long_term(state, event):
        return list(occurrences)
    assert event.start_date is not None
    effective_from = _long_version_start(event.start_date)
    representatives: Dict[Tuple, AffectedOccurrence] = {}
    for occurrence in occurrences:
        key = (
            occurrence.weekday,
            occurrence.period,
            occurrence.class_id,
            occurrence.split_block_id,
            occurrence.group_index,
        )
        current = representatives.get(key)
        if occurrence.date >= effective_from and (
            current is None or current.date < effective_from or occurrence.date < current.date
        ):
            representatives[key] = occurrence
        elif current is None:
            representatives[key] = occurrence
    return list(representatives.values())


def _qualified_teacher_ids(state: AppState, occurrence: AffectedOccurrence) -> List[str]:
    return [
        teacher.id
        for teacher in state.teachers
        if teacher.id != occurrence.teacher_id
        and occurrence.subject_id in teacher.qualified_subject_ids
    ]


def _teacher_available(
    state: AppState,
    event: ChangeEvent,
    teacher_id: str,
    on_date: date,
    period: int,
    ignored_target_ids: Set[str],
) -> bool:
    teacher = next((item for item in state.teachers if item.id == teacher_id), None)
    if teacher is None or any(
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
    for row in resolved.class_schedules.values():
        lesson = row[period]
        if lesson is None or teacher_id not in lesson.teacher_ids:
            continue
        if ignored_target_ids.intersection(lesson.target_ids):
            continue
        return False
    return True


def _teacher_available_after_recovery(
    state: AppState,
    current_event: ChangeEvent,
    teacher_id: str,
    on_date: date,
    period: int,
    ignored_target_ids: Set[str],
) -> bool:
    teacher = next((item for item in state.teachers if item.id == teacher_id), None)
    if teacher is None or any(
        slot.weekday == on_date.weekday() and slot.period == period
        for slot in teacher.weekly_unavailable_slots
    ):
        return False
    for other_event in [
        *state.change_events,
        *(change.event for change in state.applied_changes),
    ]:
        if other_event.id == current_event.id or other_event.teacher_id != teacher_id:
            continue
        if other_event.kind == ChangeEventKind.ABSENCE and (
            other_event.start_date is not None
            and other_event.end_date is not None
            and other_event.start_date <= on_date <= other_event.end_date
        ):
            return False
        if other_event.kind == ChangeEventKind.BUSY and any(
            slot.date == on_date and slot.period == period for slot in other_event.busy_slots
        ):
            return False
    try:
        resolved = resolve_day(state, on_date)
    except NoActiveTimetable:
        return False
    for row in resolved.class_schedules.values():
        lesson = row[period]
        if lesson is None or teacher_id not in lesson.teacher_ids:
            continue
        if ignored_target_ids.intersection(lesson.target_ids):
            continue
        return False
    return True


def _room_available(
    state: AppState,
    room_id: str,
    on_date: date,
    period: int,
    ignored_target_ids: Set[str],
) -> bool:
    try:
        resolved = resolve_day(state, on_date)
    except NoActiveTimetable:
        return False
    for row in resolved.class_schedules.values():
        lesson = row[period]
        if lesson is None or room_id not in lesson.room_ids:
            continue
        if ignored_target_ids.intersection(lesson.target_ids):
            continue
        return False
    return True


def _rescore(
    proposal: ChangeProposal,
    occurrences: Sequence[AffectedOccurrence],
    long_term: bool,
) -> None:
    scored = score_proposal(
        proposal.operations,
        proposal.strategy,
        len(occurrences),
        any(item.kind == "move_split_block" for item in proposal.operations),
        long_term,
        proposal.event.kind == ChangeEventKind.ABSENCE,
    )
    scored.changed_cells = proposal.score.changed_cells
    scored.affected_classes = proposal.score.affected_classes
    scored.affected_teachers = proposal.score.affected_teachers
    scored.moved_split_blocks = proposal.score.moved_split_blocks
    scored.slot_distance = proposal.score.slot_distance
    proposal.score = scored


def _is_long_term(state: AppState, event: ChangeEvent) -> bool:
    return bool(
        event.kind == ChangeEventKind.ABSENCE
        and event.start_date is not None
        and event.end_date is not None
        and (event.end_date - event.start_date).days + 1
        >= state.settings.long_absence_days
    )


def _long_version_start(start_date: date) -> date:
    monday = monday_of(start_date)
    return monday if start_date.weekday() == 0 else monday + timedelta(days=7)
