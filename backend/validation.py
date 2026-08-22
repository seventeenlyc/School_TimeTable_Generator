from __future__ import annotations

from collections import defaultdict
from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple

from pydantic import BaseModel, Field

from domain import (
    AppState,
    CourseRequirement,
    ResourceAssignment,
    SplitCourseBlock,
    TimetableVersion,
)


class ValidationIssue(BaseModel):
    code: str
    message: str
    entity_ids: List[str] = Field(default_factory=list)
    weekday: Optional[int] = None
    period: Optional[int] = None


class ValidationReport(BaseModel):
    errors: List[ValidationIssue] = Field(default_factory=list)
    warnings: List[ValidationIssue] = Field(default_factory=list)

    @property
    def valid(self) -> bool:
        return not self.errors


class ScheduleValidationError(ValueError):
    def __init__(self, report: ValidationReport):
        self.report = report
        super().__init__(
            f"timetable validation failed with {len(report.errors)} error(s)"
        )


def _error(
    report: ValidationReport,
    code: str,
    message: str,
    entity_ids: Optional[Iterable[str]] = None,
    weekday: Optional[int] = None,
    period: Optional[int] = None,
) -> None:
    report.errors.append(
        ValidationIssue(
            code=code,
            message=message,
            entity_ids=list(entity_ids or []),
            weekday=weekday,
            period=period,
        )
    )


def _report_duplicates(
    report: ValidationReport,
    entities: Sequence[object],
    field_name: str,
    entity_kind: str,
) -> None:
    seen: Set[str] = set()
    reported: Set[str] = set()
    for entity in entities:
        value = getattr(entity, field_name)
        if value in seen and value not in reported:
            _error(
                report,
                f"duplicate_{field_name}",
                f"Duplicate {entity_kind} {field_name}: {value}",
                [value],
            )
            reported.add(value)
        seen.add(value)


def validate_catalog(state: AppState) -> ValidationReport:
    report = ValidationReport()
    named_catalogs = (
        (state.teachers, "teacher"),
        (state.classes, "class"),
        (state.subjects, "subject"),
        (state.rooms, "room"),
        (state.split_course_blocks, "split block"),
    )
    for entities, entity_kind in named_catalogs:
        _report_duplicates(report, entities, "id", entity_kind)
        _report_duplicates(report, entities, "name", entity_kind)
    _report_duplicates(
        report,
        state.course_requirements,
        "id",
        "course requirement",
    )

    all_groups = [
        group
        for block in state.split_course_blocks
        for group in block.groups
    ]
    _report_duplicates(report, all_groups, "id", "split group")

    teachers = {item.id: item for item in state.teachers}
    classes = {item.id: item for item in state.classes}
    subjects = {item.id: item for item in state.subjects}
    rooms = {item.id: item for item in state.rooms}
    requirements = {item.id: item for item in state.course_requirements}
    week_capacity = state.settings.working_days * state.settings.periods_per_day

    for teacher in state.teachers:
        for subject_id in teacher.qualified_subject_ids:
            if subject_id not in subjects:
                _error(
                    report,
                    "missing_reference",
                    "Teacher qualification references an unknown subject",
                    [teacher.id, subject_id],
                )
        if teacher.homeroom_class_id and teacher.homeroom_class_id not in classes:
            _error(
                report,
                "missing_reference",
                "Teacher homeroom assignment references an unknown class",
                [teacher.id, teacher.homeroom_class_id],
            )
        if teacher.main_subject_id and teacher.main_subject_id not in subjects:
            _error(
                report,
                "missing_reference",
                "Teacher main subject references an unknown subject",
                [teacher.id, teacher.main_subject_id],
            )
        for assignment_id in teacher.teaching_assignment_ids:
            requirement = requirements.get(assignment_id)
            if requirement is None or requirement.teacher_id != teacher.id:
                _error(
                    report,
                    "teacher_assignment_mismatch",
                    "Teacher assignment does not match a course requirement",
                    [teacher.id, assignment_id],
                )
        for slot in teacher.weekly_unavailable_slots:
            if slot.period >= state.settings.periods_per_day:
                _error(
                    report,
                    "slot_out_of_range",
                    "Teacher unavailable slot exceeds the configured day",
                    [teacher.id],
                    slot.weekday,
                    slot.period,
                )

    requirements_by_class_subject: Dict[
        Tuple[str, str], List[CourseRequirement]
    ] = defaultdict(list)
    for requirement in state.course_requirements:
        requirements_by_class_subject[
            (requirement.class_id, requirement.subject_id)
        ].append(requirement)

    for (class_id, subject_id), duplicates in requirements_by_class_subject.items():
        if len(duplicates) < 2:
            continue
        teacher_ids = list(dict.fromkeys(item.teacher_id for item in duplicates))
        code = (
            "duplicate_course_requirement_teachers"
            if len(teacher_ids) > 1
            else "duplicate_course_requirement"
        )
        message = (
            "One class and subject are assigned to different teachers"
            if len(teacher_ids) > 1
            else "Course requirement is duplicated for one class and subject"
        )
        _error(
            report,
            code,
            message,
            [class_id, subject_id, *(item.id for item in duplicates), *teacher_ids],
        )

    for requirement in state.course_requirements:
        references = (
            (requirement.class_id, classes, "class"),
            (requirement.subject_id, subjects, "subject"),
            (requirement.teacher_id, teachers, "teacher"),
        )
        for reference_id, catalog, reference_kind in references:
            if reference_id not in catalog:
                _error(
                    report,
                    "missing_reference",
                    f"Course requirement references an unknown {reference_kind}",
                    [requirement.id, reference_id],
                )
        if requirement.room_id and requirement.room_id not in rooms:
            _error(
                report,
                "missing_reference",
                "Course requirement references an unknown room",
                [requirement.id, requirement.room_id],
            )
        teacher = teachers.get(requirement.teacher_id)
        if teacher is not None:
            if requirement.id not in teacher.teaching_assignment_ids:
                _error(
                    report,
                    "teacher_assignment_mismatch",
                    "Course requirement is absent from its teacher assignments",
                    [teacher.id, requirement.id],
                )
            if requirement.subject_id not in teacher.qualified_subject_ids:
                _error(
                    report,
                    "unqualified_teacher",
                    "Teacher is not qualified for the requirement subject",
                    [teacher.id, requirement.subject_id, requirement.id],
                )
        if requirement.periods_per_week > week_capacity:
            _error(
                report,
                "periods_exceed_capacity",
                "Course requirement exceeds the configured week capacity",
                [requirement.id],
            )
        if requirement.consecutive_periods > state.settings.periods_per_day:
            _error(
                report,
                "periods_exceed_capacity",
                "Consecutive lesson length exceeds the configured day",
                [requirement.id],
            )

        # Fixed slots validation
        seen_fixed_slots: Set[Tuple[int, int]] = set()
        has_duplicate_fixed_slot = False
        for slot in requirement.fixed_slots:
            slot_key = (slot.weekday, slot.period)
            if slot_key in seen_fixed_slots:
                has_duplicate_fixed_slot = True
            seen_fixed_slots.add(slot_key)

            if (
                slot.weekday < 0
                or slot.weekday >= state.settings.working_days
                or slot.period < 0
                or slot.period >= state.settings.periods_per_day
            ):
                _error(
                    report,
                    "slot_out_of_range",
                    "Course requirement fixed slot exceeds configured school schedule",
                    [requirement.id],
                    slot.weekday,
                    slot.period,
                )

        if has_duplicate_fixed_slot:
            _error(
                report,
                "duplicate_fixed_slot",
                "Course requirement contains duplicate fixed slots",
                [requirement.id],
            )

        if len(requirement.fixed_slots) > requirement.periods_per_week:
            _error(
                report,
                "fixed_slot_count",
                "Course requirement fixed slots count exceeds periods per week",
                [requirement.id],
            )

        if requirement.consecutive_periods != 1 and requirement.fixed_slots:
            _error(
                report,
                "fixed_slot_consecutive",
                "Fixed slots are only supported for courses with consecutive_periods = 1",
                [requirement.id],
            )

        if teacher is not None and requirement.fixed_slots:
            unavailable_set = {
                (s.weekday, s.period) for s in teacher.weekly_unavailable_slots
            }
            for slot in requirement.fixed_slots:
                if (slot.weekday, slot.period) in unavailable_set:
                    _error(
                        report,
                        "fixed_slot_unavailable",
                        "Course requirement fixed slot falls on teacher unavailable slot",
                        [requirement.id, teacher.id],
                        slot.weekday,
                        slot.period,
                    )

    # Fixed slot conflicts across requirements: class, teacher, room
    class_fixed_slots: Dict[Tuple[str, int, int], List[str]] = defaultdict(list)
    teacher_fixed_slots: Dict[Tuple[str, int, int], List[str]] = defaultdict(list)
    room_fixed_slots: Dict[Tuple[str, int, int], List[str]] = defaultdict(list)

    for requirement in state.course_requirements:
        unique_fixed_slots = {
            (slot.weekday, slot.period) for slot in requirement.fixed_slots
        }
        for weekday, period in unique_fixed_slots:
            class_fixed_slots[(requirement.class_id, weekday, period)].append(
                requirement.id
            )
            teacher_fixed_slots[(requirement.teacher_id, weekday, period)].append(
                requirement.id
            )
            if requirement.room_id:
                room_fixed_slots[(requirement.room_id, weekday, period)].append(
                    requirement.id
                )

    for (class_id, weekday, period), req_ids in class_fixed_slots.items():
        if len(req_ids) > 1:
            _error(
                report,
                "fixed_slot_conflict",
                f"Multiple course requirements conflict on class {class_id} at weekday {weekday}, period {period}",
                [class_id, *req_ids],
                weekday,
                period,
            )

    for (teacher_id, weekday, period), req_ids in teacher_fixed_slots.items():
        if len(req_ids) > 1:
            _error(
                report,
                "fixed_slot_conflict",
                f"Multiple course requirements conflict on teacher {teacher_id} at weekday {weekday}, period {period}",
                [teacher_id, *req_ids],
                weekday,
                period,
            )

    for (room_id, weekday, period), req_ids in room_fixed_slots.items():
        if len(req_ids) > 1:
            _error(
                report,
                "fixed_slot_conflict",
                f"Multiple course requirements conflict on room {room_id} at weekday {weekday}, period {period}",
                [room_id, *req_ids],
                weekday,
                period,
            )

    for block in state.split_course_blocks:
        duplicate_sources = _duplicate_values(block.source_class_ids)
        if duplicate_sources:
            _error(
                report,
                "duplicate_split_source_class",
                "Split block repeats a source class",
                [block.id, *duplicate_sources],
            )
        for class_id in block.source_class_ids:
            if class_id not in classes:
                _error(
                    report,
                    "missing_reference",
                    "Split block references an unknown source class",
                    [block.id, class_id],
                )
        if block.periods_per_week > week_capacity:
            _error(
                report,
                "periods_exceed_capacity",
                "Split block exceeds the configured week capacity",
                [block.id],
            )
        duplicate_rooms = _duplicate_values(
            [group.room_id for group in block.groups]
        )
        if duplicate_rooms:
            _error(
                report,
                "split_room_reused",
                "Split block groups reuse a room",
                [block.id, *duplicate_rooms],
            )
        for group in block.groups:
            references = (
                (group.subject_id, subjects, "subject"),
                (group.teacher_id, teachers, "teacher"),
                (group.room_id, rooms, "room"),
            )
            for reference_id, catalog, reference_kind in references:
                if reference_id not in catalog:
                    _error(
                        report,
                        "missing_reference",
                        f"Split group references an unknown {reference_kind}",
                        [block.id, group.id, reference_id],
                    )
            teacher = teachers.get(group.teacher_id)
            if (
                teacher is not None
                and group.subject_id not in teacher.qualified_subject_ids
            ):
                _error(
                    report,
                    "unqualified_teacher",
                    "Teacher is not qualified for the split group subject",
                    [teacher.id, group.subject_id, block.id, group.id],
                )

    return report


def _duplicate_values(values: Iterable[str]) -> List[str]:
    seen: Set[str] = set()
    duplicates: List[str] = []
    for value in values:
        if value in seen and value not in duplicates:
            duplicates.append(value)
        seen.add(value)
    return duplicates


def _empty_resource_schedule(state: AppState):
    return [
        [None for _ in range(state.settings.periods_per_day)]
        for _ in range(state.settings.working_days)
    ]


def rebuild_resource_indexes(
    state: AppState,
    version: TimetableVersion,
) -> TimetableVersion:
    rebuilt = version.copy(deep=True)
    rebuilt.teacher_schedules = {
        teacher.id: _empty_resource_schedule(state)
        for teacher in state.teachers
    }
    rebuilt.room_schedules = {
        room.id: _empty_resource_schedule(state)
        for room in state.rooms
    }

    requirements = {item.id: item for item in state.course_requirements}
    blocks = {item.id: item for item in state.split_course_blocks}
    split_slots: Set[Tuple[str, int, int]] = set()

    for class_id, schedule in version.class_schedules.items():
        for weekday, day in enumerate(schedule[: state.settings.working_days]):
            for period, cell in enumerate(day[: state.settings.periods_per_day]):
                if cell is None:
                    continue
                if cell.kind == "lesson":
                    requirement = requirements.get(cell.requirement_id)
                    if requirement is None:
                        continue
                    assignment = ResourceAssignment(
                        target_kind="requirement",
                        target_id=requirement.id,
                        class_ids=[class_id],
                        subject_id=requirement.subject_id,
                        teacher_id=requirement.teacher_id,
                        room_id=requirement.room_id,
                    )
                    _place_resource_assignment(
                        rebuilt.teacher_schedules,
                        requirement.teacher_id,
                        weekday,
                        period,
                        assignment,
                    )
                    if requirement.room_id:
                        _place_resource_assignment(
                            rebuilt.room_schedules,
                            requirement.room_id,
                            weekday,
                            period,
                            assignment,
                        )
                elif cell.split_block_id in blocks:
                    split_slots.add((cell.split_block_id, weekday, period))

    for block_id, weekday, period in sorted(split_slots):
        block = blocks[block_id]
        for group in block.groups:
            assignment = ResourceAssignment(
                target_kind="split_group",
                target_id=group.id,
                class_ids=list(block.source_class_ids),
                subject_id=group.subject_id,
                teacher_id=group.teacher_id,
                room_id=group.room_id,
            )
            _place_resource_assignment(
                rebuilt.teacher_schedules,
                group.teacher_id,
                weekday,
                period,
                assignment,
            )
            _place_resource_assignment(
                rebuilt.room_schedules,
                group.room_id,
                weekday,
                period,
                assignment,
            )

    return rebuilt


def _place_resource_assignment(
    schedules,
    resource_id: str,
    weekday: int,
    period: int,
    assignment: ResourceAssignment,
) -> None:
    schedule = schedules.get(resource_id)
    if schedule is not None:
        schedule[weekday][period] = assignment


def validate_timetable_version(
    state: AppState,
    version: TimetableVersion,
) -> ValidationReport:
    report = validate_catalog(state)
    if not report.valid:
        return report

    teachers = {item.id: item for item in state.teachers}
    classes = {item.id: item for item in state.classes}
    requirements = {item.id: item for item in state.course_requirements}
    blocks = {item.id: item for item in state.split_course_blocks}

    expected_class_ids = set(classes)
    actual_class_ids = set(version.class_schedules)
    for class_id in sorted(actual_class_ids - expected_class_ids):
        _error(
            report,
            "unknown_class_schedule",
            "Timetable contains a schedule for an unknown class",
            [class_id],
        )

    teacher_occupancy = defaultdict(list)
    room_occupancy = defaultdict(list)
    class_occupancy = defaultdict(list)
    requirement_counts = defaultdict(int)
    requirement_slots = defaultdict(list)
    daily_subject_counts = defaultdict(int)
    split_references = defaultdict(lambda: defaultdict(set))

    for class_id in sorted(expected_class_ids):
        schedule = version.class_schedules.get(class_id)
        if not _valid_schedule_shape(state, schedule):
            _error(
                report,
                "invalid_class_schedule_shape",
                "Class schedule must contain the configured rows and periods",
                [class_id],
            )
        if schedule is None:
            continue
        for weekday, day in enumerate(schedule[: state.settings.working_days]):
            for period, cell in enumerate(day[: state.settings.periods_per_day]):
                if cell is None:
                    continue
                class_occupancy[(class_id, weekday, period)].append(
                    [cell.requirement_id or cell.split_block_id, class_id]
                )
                if cell.kind == "lesson":
                    requirement = requirements.get(cell.requirement_id)
                    if requirement is None:
                        _error(
                            report,
                            "unknown_requirement",
                            "Lesson cell references an unknown requirement",
                            [class_id, cell.requirement_id],
                            weekday,
                            period,
                        )
                        continue
                    if requirement.class_id != class_id:
                        _error(
                            report,
                            "requirement_class_mismatch",
                            "Lesson requirement belongs to another class",
                            [class_id, requirement.id, requirement.class_id],
                            weekday,
                            period,
                        )
                        continue
                    _record_requirement_occupancy(
                        requirement,
                        class_id,
                        weekday,
                        period,
                        teacher_occupancy,
                        room_occupancy,
                    )
                    requirement_counts[requirement.id] += 1
                    requirement_slots[requirement.id].append((weekday, period))
                    daily_subject_counts[
                        (class_id, weekday, requirement.subject_id)
                    ] += 1
                else:
                    block = blocks.get(cell.split_block_id)
                    if block is None:
                        _error(
                            report,
                            "unknown_split_block",
                            "Split cell references an unknown split block",
                            [class_id, cell.split_block_id],
                            weekday,
                            period,
                        )
                        continue
                    if class_id not in block.source_class_ids:
                        _error(
                            report,
                            "split_source_class_mismatch",
                            "Class is not a source of the referenced split block",
                            [class_id, block.id],
                            weekday,
                            period,
                        )
                        continue
                    split_references[block.id][class_id].add((weekday, period))

    _record_split_occupancy(
        blocks,
        split_references,
        teacher_occupancy,
        room_occupancy,
        class_occupancy,
    )
    _validate_occupancy(report, "teacher", teacher_occupancy)
    _validate_occupancy(report, "room", room_occupancy)
    _validate_occupancy(report, "class", class_occupancy)
    _validate_teacher_availability(report, teachers, teacher_occupancy)
    _validate_split_blocks(report, blocks, split_references)
    _validate_requirement_counts(report, state, requirement_counts)
    _validate_fixed_slots(report, state, requirement_slots)
    _validate_daily_subject_limits(report, state, daily_subject_counts)
    _validate_split_daily_subject_limits(report, state, split_references)
    _validate_consecutive_periods(
        report,
        state.course_requirements,
        requirement_slots,
    )

    rebuilt = rebuild_resource_indexes(state, version)
    if (
        version.teacher_schedules != rebuilt.teacher_schedules
        or version.room_schedules != rebuilt.room_schedules
    ):
        _error(
            report,
            "resource_index_stale",
            "Stored teacher or room schedules do not match class schedules",
            [version.id],
        )

    return report


def _valid_schedule_shape(state: AppState, schedule) -> bool:
    if schedule is None or len(schedule) != state.settings.working_days:
        return False
    return all(len(day) == state.settings.periods_per_day for day in schedule)


def _record_requirement_occupancy(
    requirement: CourseRequirement,
    class_id: str,
    weekday: int,
    period: int,
    teacher_occupancy,
    room_occupancy,
) -> None:
    entity_ids = [requirement.id, class_id]
    teacher_occupancy[(requirement.teacher_id, weekday, period)].append(
        entity_ids
    )
    if requirement.room_id:
        room_occupancy[(requirement.room_id, weekday, period)].append(
            entity_ids
        )


def _record_split_occupancy(
    blocks: Dict[str, SplitCourseBlock],
    split_references,
    teacher_occupancy,
    room_occupancy,
    class_occupancy,
) -> None:
    for block_id, by_class in split_references.items():
        block = blocks[block_id]
        slots = set().union(*by_class.values()) if by_class else set()
        for weekday, period in slots:
            for group in block.groups:
                entity_ids = [block.id, group.id, *block.source_class_ids]
                teacher_occupancy[(group.teacher_id, weekday, period)].append(
                    entity_ids
                )
                room_occupancy[(group.room_id, weekday, period)].append(
                    entity_ids
                )
            for class_id in block.source_class_ids:
                assignments = class_occupancy[(class_id, weekday, period)]
                if not any(ids[0] == block.id for ids in assignments):
                    assignments.append([block.id, class_id])


def _validate_occupancy(report, resource_kind: str, occupancy) -> None:
    for (resource_id, weekday, period), assignments in occupancy.items():
        if len(assignments) <= 1:
            continue
        entity_ids = [resource_id]
        for assignment_ids in assignments:
            for entity_id in assignment_ids:
                if entity_id not in entity_ids:
                    entity_ids.append(entity_id)
        _error(
            report,
            f"{resource_kind}_double_booked",
            f"{resource_kind.title()} has multiple assignments in one slot",
            entity_ids,
            weekday,
            period,
        )


def _validate_teacher_availability(report, teachers, occupancy) -> None:
    unavailable = {
        teacher.id: {
            (slot.weekday, slot.period)
            for slot in teacher.weekly_unavailable_slots
        }
        for teacher in teachers.values()
    }
    for (teacher_id, weekday, period), assignments in occupancy.items():
        if (weekday, period) not in unavailable.get(teacher_id, set()):
            continue
        entity_ids = [teacher_id]
        for assignment_ids in assignments:
            entity_ids.extend(
                item for item in assignment_ids if item not in entity_ids
            )
        _error(
            report,
            "teacher_unavailable",
            "Teacher is assigned during a weekly unavailable slot",
            entity_ids,
            weekday,
            period,
        )


def _validate_split_blocks(report, blocks, split_references) -> None:
    for block in blocks.values():
        by_class = split_references.get(block.id, {})
        slots = set().union(*by_class.values()) if by_class else set()
        for weekday, period in sorted(slots):
            missing_classes = [
                class_id
                for class_id in block.source_class_ids
                if (weekday, period) not in by_class.get(class_id, set())
            ]
            if missing_classes:
                _error(
                    report,
                    "split_block_not_synchronized",
                    "Split block is not present in every source class",
                    [block.id, *missing_classes],
                    weekday,
                    period,
                )
        if len(slots) != block.periods_per_week:
            _error(
                report,
                "split_block_period_count",
                "Split block weekly occurrence count is not exact",
                [block.id],
            )


def _validate_requirement_counts(report, state, requirement_counts) -> None:
    for requirement in state.course_requirements:
        actual = requirement_counts.get(requirement.id, 0)
        if actual != requirement.periods_per_week:
            _error(
                report,
                "weekly_period_count",
                (
                    f"Requirement expects {requirement.periods_per_week} "
                    f"period(s), found {actual}"
                ),
                [requirement.id, requirement.class_id, requirement.subject_id],
            )


def _validate_fixed_slots(report, state, requirement_slots) -> None:
    for requirement in state.course_requirements:
        assigned = set(requirement_slots.get(requirement.id, []))
        for slot in requirement.fixed_slots:
            if (
                0 <= slot.weekday < state.settings.working_days
                and 0 <= slot.period < state.settings.periods_per_day
            ):
                if (slot.weekday, slot.period) not in assigned:
                    _error(
                        report,
                        "missing_fixed_slot",
                        "Fixed slot requirement is not satisfied",
                        [requirement.id, requirement.class_id, requirement.subject_id],
                        slot.weekday,
                        slot.period,
                    )


def _validate_daily_subject_limits(report, state, daily_subject_counts) -> None:
    limit = state.settings.max_daily_subject_periods
    for (class_id, weekday, subject_id), count in daily_subject_counts.items():
        if count > limit:
            _error(
                report,
                "daily_subject_limit",
                f"Daily subject count {count} exceeds the limit {limit}",
                [class_id, subject_id],
                weekday,
            )


def _validate_split_daily_subject_limits(report, state, split_references) -> None:
    limit = state.settings.max_daily_subject_periods
    for block in state.split_course_blocks:
        by_class = split_references.get(block.id, {})
        slots = set().union(*by_class.values()) if by_class else set()
        slots_by_day = defaultdict(int)
        for weekday, period in slots:
            slots_by_day[weekday] += 1
        for weekday, count in slots_by_day.items():
            if count > limit:
                _error(
                    report,
                    "split_daily_subject_limit",
                    f"Daily split block count {count} exceeds the limit {limit}",
                    [block.id],
                    weekday,
                )


def _validate_consecutive_periods(
    report,
    requirements,
    requirement_slots,
) -> None:
    for requirement in requirements:
        block_size = requirement.consecutive_periods
        if block_size <= 1:
            continue
        slots_by_day = defaultdict(list)
        for weekday, period in requirement_slots.get(requirement.id, []):
            slots_by_day[weekday].append(period)
        invalid = False
        for periods in slots_by_day.values():
            run_length = 0
            previous = None
            for period in sorted(periods):
                if previous is None or period == previous + 1:
                    run_length += 1
                else:
                    if run_length % block_size:
                        invalid = True
                    run_length = 1
                previous = period
            if run_length % block_size:
                invalid = True
        if invalid:
            _error(
                report,
                "consecutive_periods",
                "Requirement does not occur only in complete adjacent blocks",
                [requirement.id],
            )


def assert_valid_version(
    state: AppState,
    version: TimetableVersion,
) -> ValidationReport:
    report = validate_timetable_version(state, version)
    if not report.valid:
        raise ScheduleValidationError(report)
    return report
