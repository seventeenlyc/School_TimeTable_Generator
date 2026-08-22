from __future__ import annotations

from copy import deepcopy
from datetime import date, timedelta
from typing import Dict, Iterator, List, Optional

from pydantic import BaseModel

from domain import (
    AppState,
    ClassSchedules,
    DateException,
    LessonCell,
    TeacherSubstitution,
    TimetableVersion,
)
from validation import rebuild_resource_indexes


class NoActiveTimetable(LookupError):
    def __init__(self, on_date: date):
        self.on_date = on_date
        super().__init__(f"no timetable is effective on {on_date.isoformat()}")


class ResolvedLesson(BaseModel):
    cell: LessonCell
    class_ids: List[str]
    subject_ids: List[str]
    teacher_ids: List[str]
    room_ids: List[str]
    target_ids: List[str]


class ResolvedDay(BaseModel):
    date: date
    version_id: Optional[str]
    class_schedules: Dict[str, List[Optional[ResolvedLesson]]]

    def teacher_for(self, target_id: str, period: int) -> Optional[str]:
        for lessons in self.class_schedules.values():
            lesson = lessons[period]
            if lesson and target_id in lesson.target_ids:
                index = lesson.target_ids.index(target_id)
                return lesson.teacher_ids[index]
        return None


def monday_of(value: date) -> date:
    return value - timedelta(days=value.weekday())


def iter_school_dates(start: date, end: date) -> Iterator[date]:
    current = start
    while current <= end:
        if current.weekday() <= 5:
            yield current
        current += timedelta(days=1)


def get_active_version(state: AppState, on_date: date) -> TimetableVersion:
    matches = [
        version
        for version in state.timetable_versions
        if version.effective_from <= on_date
    ]
    if not matches:
        raise NoActiveTimetable(on_date)
    return max(
        matches,
        key=lambda item: (item.effective_from, item.created_at, item.id),
    )


def resolve_day(state: AppState, on_date: date) -> ResolvedDay:
    if on_date.weekday() == 6:
        return ResolvedDay(
            date=on_date,
            version_id=None,
            class_schedules={},
        )

    version = get_active_version(state, on_date)
    weekday = on_date.weekday()
    cells = {
        class_id: [
            cell.copy(deep=True) if cell is not None else None
            for cell in schedule[weekday]
        ]
        for class_id, schedule in version.class_schedules.items()
    }
    exceptions = list(_exceptions_for(state, on_date))

    for exception in exceptions:
        for override in exception.cell_overrides:
            if override.date != on_date:
                continue
            cells[override.class_id][override.period] = (
                override.after.copy(deep=True)
                if override.after is not None
                else None
            )

    resolved = _expand_cells(state, cells)
    for exception in exceptions:
        for substitution in exception.teacher_substitutions:
            if substitution.date == on_date:
                _apply_substitution(resolved, substitution)

    return ResolvedDay(
        date=on_date,
        version_id=version.id,
        class_schedules=resolved,
    )


def resolve_week(state: AppState, monday: date) -> List[ResolvedDay]:
    if monday.weekday() != 0:
        raise ValueError("monday must be a Monday")
    return [
        resolve_day(state, monday + timedelta(days=offset))
        for offset in range(6)
    ]


def create_child_version(
    state: AppState,
    parent: TimetableVersion,
    *,
    name: str,
    effective_from: date,
    class_schedules: ClassSchedules,
    source_change_event_id: Optional[str] = None,
) -> TimetableVersion:
    candidate = TimetableVersion(
        name=name,
        effective_from=effective_from,
        parent_version_id=parent.id,
        class_schedules=deepcopy(class_schedules),
        source_change_event_id=source_change_event_id,
    )
    return rebuild_resource_indexes(state, candidate)


def _exceptions_for(
    state: AppState,
    on_date: date,
) -> Iterator[DateException]:
    for change in state.applied_changes:
        for exception in change.date_exceptions:
            if exception.date == on_date:
                yield exception


def _expand_cells(
    state: AppState,
    cells: Dict[str, List[Optional[LessonCell]]],
) -> Dict[str, List[Optional[ResolvedLesson]]]:
    requirements = {item.id: item for item in state.course_requirements}
    blocks = {item.id: item for item in state.split_course_blocks}
    schedules: Dict[str, List[Optional[ResolvedLesson]]] = {}

    for class_id, row in cells.items():
        lessons: List[Optional[ResolvedLesson]] = []
        for cell in row:
            if cell is None:
                lessons.append(None)
                continue
            if cell.kind == "lesson":
                requirement = requirements[cell.requirement_id]
                lessons.append(
                    ResolvedLesson(
                        cell=cell,
                        class_ids=[class_id],
                        subject_ids=[requirement.subject_id],
                        teacher_ids=[requirement.teacher_id],
                        room_ids=(
                            [requirement.room_id]
                            if requirement.room_id is not None
                            else []
                        ),
                        target_ids=[requirement.id],
                    )
                )
                continue

            block = blocks[cell.split_block_id]
            lessons.append(
                ResolvedLesson(
                    cell=cell,
                    class_ids=list(block.source_class_ids),
                    subject_ids=[group.subject_id for group in block.groups],
                    teacher_ids=[group.teacher_id for group in block.groups],
                    room_ids=[group.room_id for group in block.groups],
                    target_ids=[group.id for group in block.groups],
                )
            )
        schedules[class_id] = lessons

    return schedules


def _apply_substitution(
    schedules: Dict[str, List[Optional[ResolvedLesson]]],
    substitution: TeacherSubstitution,
) -> None:
    expected_kind = (
        "lesson" if substitution.target_kind == "requirement" else "split"
    )
    for row in schedules.values():
        lesson = row[substitution.period]
        if lesson is None or lesson.cell.kind != expected_kind:
            continue
        if substitution.target_id not in lesson.target_ids:
            continue
        index = lesson.target_ids.index(substitution.target_id)
        if lesson.teacher_ids[index] == substitution.original_teacher_id:
            lesson.teacher_ids[index] = substitution.substitute_teacher_id


def validate_resolved_day(state: AppState, resolved: ResolvedDay) -> List[dict]:
    issues: List[dict] = []

    def add_issue(code: str, message: str, period: Optional[int], entity_ids: List[str]) -> None:
        issues.append({
            "code": code,
            "message": message,
            "period": period,
            "entity_ids": entity_ids,
        })

    requirements_map = {req.id: req for req in (state.course_requirements or []) if req and req.id}
    blocks_map = {b.id: b for b in (state.split_course_blocks or []) if b and b.id}
    teachers_map = {t.id: t for t in (state.teachers or []) if t and t.id}

    # Find max period across all classes safely
    all_periods = set()
    for row in resolved.class_schedules.values():
        if row:
            for p in range(len(row)):
                all_periods.add(p)

    sorted_periods = sorted(all_periods)

    for period in sorted_periods:
        # Collect split blocks appearing in this period and which classes have them
        split_classes_by_block: Dict[str, List[str]] = {}
        # Track seen (period, target_id) to avoid duplicates from split lessons across source classes
        seen_targets_in_period = set()
        # Occupancy tracking: resource_id -> list of target_ids
        teacher_targets: Dict[str, List[str]] = {}
        room_targets: Dict[str, List[str]] = {}

        for class_id, row in resolved.class_schedules.items():
            if period >= len(row):
                continue
            lesson = row[period]
            if lesson is None:
                continue

            cell = getattr(lesson, "cell", None)
            kind = getattr(cell, "kind", None) if cell else None
            req_id = getattr(cell, "requirement_id", None) if cell else None
            block_id = getattr(cell, "split_block_id", None) if cell else None

            teacher_ids = getattr(lesson, "teacher_ids", []) or []
            subject_ids = getattr(lesson, "subject_ids", []) or []
            room_ids = getattr(lesson, "room_ids", []) or []
            target_ids = getattr(lesson, "target_ids", []) or []

            # 1. Structure lengths validation
            # teacher_ids/subject_ids/target_ids 长度一致；room_ids 可为0（普通课无教室）或与 target_ids 同长，否则 issue
            len_target = len(target_ids)
            len_teacher = len(teacher_ids)
            len_subject = len(subject_ids)
            len_room = len(room_ids)

            if len_teacher != len_target or len_subject != len_target:
                add_issue(
                    code="lesson_structure_mismatch",
                    message="teacher_ids, subject_ids, and target_ids lengths must match",
                    period=period,
                    entity_ids=[class_id],
                )

            if len_room != 0 and len_room != len_target:
                add_issue(
                    code="lesson_room_structure_mismatch",
                    message="room_ids length must be 0 or match target_ids length",
                    period=period,
                    entity_ids=[class_id],
                )

            # 2. Kind specific validation
            if kind == "lesson":
                if not req_id or req_id not in requirements_map:
                    add_issue(
                        code="unknown_requirement",
                        message=f"Requirement {req_id} does not exist in course_requirements",
                        period=period,
                        entity_ids=[class_id, req_id] if req_id else [class_id],
                    )
                else:
                    req = requirements_map[req_id]
                    if req.class_id != class_id:
                        add_issue(
                            code="requirement_class_mismatch",
                            message=f"Requirement {req_id} class {req.class_id} does not match current class {class_id}",
                            period=period,
                            entity_ids=[class_id, req_id, req.class_id],
                        )
                # Also check target_ids contains requirement_id or targets belong to requirements
                for tid in target_ids:
                    if not tid or tid not in requirements_map:
                        add_issue(
                            code="unknown_target_requirement",
                            message=f"Target {tid} does not exist in course_requirements",
                            period=period,
                            entity_ids=[class_id, tid] if tid else [class_id],
                        )
                    else:
                        req = requirements_map[tid]
                        if req.class_id != class_id:
                            add_issue(
                                code="target_requirement_class_mismatch",
                                message=f"Target requirement {tid} class {req.class_id} does not match current class {class_id}",
                                period=period,
                                entity_ids=[class_id, tid, req.class_id],
                            )

            elif kind == "split":
                if not block_id or block_id not in blocks_map:
                    add_issue(
                        code="unknown_split_block",
                        message=f"Split block {block_id} does not exist",
                        period=period,
                        entity_ids=[class_id, block_id] if block_id else [class_id],
                    )
                else:
                    block = blocks_map[block_id]
                    if block_id not in split_classes_by_block:
                        split_classes_by_block[block_id] = []
                    split_classes_by_block[block_id].append(class_id)

                    block_group_ids = {g.id for g in (block.groups or []) if g and g.id}
                    for tid in target_ids:
                        if tid not in block_group_ids:
                            add_issue(
                                code="split_target_not_in_block",
                                message=f"Split target {tid} does not belong to split block {block_id}",
                                period=period,
                                entity_ids=[class_id, block_id, tid] if tid else [class_id, block_id],
                            )
            else:
                add_issue(
                    code="unknown_lesson_kind",
                    message=f"Unknown lesson kind: {kind}",
                    period=period,
                    entity_ids=[class_id],
                )

            # 3. Teacher qualification & Resource occupancy collection
            min_len = min(len_teacher, len_subject, len_target)
            for idx in range(min_len):
                t_id = teacher_ids[idx]
                s_id = subject_ids[idx]
                tgt_id = target_ids[idx]
                r_id = room_ids[idx] if idx < len_room else None

                # Teacher qualification
                if not t_id or t_id not in teachers_map:
                    add_issue(
                        code="unknown_teacher",
                        message=f"Teacher {t_id} does not exist",
                        period=period,
                        entity_ids=[class_id, t_id] if t_id else [class_id],
                    )
                else:
                    teacher_obj = teachers_map[t_id]
                    if s_id not in (teacher_obj.qualified_subject_ids or []):
                        add_issue(
                            code="teacher_unqualified",
                            message=f"Teacher {t_id} is not qualified for subject {s_id}",
                            period=period,
                            entity_ids=[class_id, t_id, s_id],
                        )

                # Deduplicate occupancy per (period, target_id)
                if tgt_id not in seen_targets_in_period:
                    seen_targets_in_period.add(tgt_id)
                    if t_id:
                        if t_id not in teacher_targets:
                            teacher_targets[t_id] = []
                        teacher_targets[t_id].append(tgt_id)
                    if r_id:
                        if r_id not in room_targets:
                            room_targets[r_id] = []
                        room_targets[r_id].append(tgt_id)

        # 4. Check split block synchronization in this period
        # split lesson 的 target 必须属于其 block，且同一 split_block 在 block.source_class_ids 所有且仅这些班同 period 同步出现；
        for block_id, classes_with_block in split_classes_by_block.items():
            block = blocks_map[block_id]
            expected_classes = set(block.source_class_ids or [])
            actual_classes = set(classes_with_block)

            missing_classes = expected_classes - actual_classes
            extra_classes = actual_classes - expected_classes

            if missing_classes or extra_classes:
                add_issue(
                    code="split_block_not_synchronized",
                    message=f"Split block {block_id} is not synchronized across source classes",
                    period=period,
                    entity_ids=[block_id, *sorted(missing_classes | extra_classes)],
                )

        # 5. Teacher / Room conflicts
        # 同一教师或同一非空教室同 period 不得用于两个不同 target
        for t_id, t_targets in teacher_targets.items():
            unique_targets = list(dict.fromkeys(t_targets))
            if len(unique_targets) > 1:
                add_issue(
                    code="teacher_double_booked",
                    message=f"Teacher {t_id} is assigned to multiple targets in period {period}",
                    period=period,
                    entity_ids=[t_id, *unique_targets],
                )

        for r_id, r_targets in room_targets.items():
            unique_targets = list(dict.fromkeys(r_targets))
            if len(unique_targets) > 1:
                add_issue(
                    code="room_double_booked",
                    message=f"Room {r_id} is assigned to multiple targets in period {period}",
                    period=period,
                    entity_ids=[r_id, *unique_targets],
                )

    return issues
