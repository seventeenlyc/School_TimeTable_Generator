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
