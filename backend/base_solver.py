from __future__ import annotations

from collections import defaultdict
from datetime import date
from typing import DefaultDict, Dict, Iterable, List, Optional, Sequence, Tuple

from ortools.sat.python import cp_model
from pydantic import BaseModel, Field

from domain import (
    AppState,
    CourseRequirement,
    LessonCell,
    SplitCourseBlock,
    TimetableVersion,
)
from validation import assert_valid_version, rebuild_resource_indexes


class GenerationDiagnostic(BaseModel):
    code: str
    message: str
    entity_ids: List[str] = Field(default_factory=list)
    required: Optional[int] = None
    available: Optional[int] = None


class GenerationError(RuntimeError):
    def __init__(self, diagnostics: Sequence[GenerationDiagnostic]):
        self.diagnostics = list(diagnostics)
        summary = "; ".join(item.message for item in self.diagnostics)
        super().__init__(f"timetable generation failed: {summary}")


VariableKey = Tuple[str, int, int]


def generate_base_timetable(
    state: AppState,
    name: str,
    effective_from: date,
) -> TimetableVersion:
    days = range(state.settings.working_days)
    periods = range(state.settings.periods_per_day)
    invalid_consecutive = _invalid_consecutive_diagnostics(state)
    if invalid_consecutive:
        raise GenerationError(invalid_consecutive)

    model = cp_model.CpModel()
    normal: Dict[VariableKey, cp_model.IntVar] = {}
    split: Dict[VariableKey, cp_model.IntVar] = {}

    for requirement in state.course_requirements:
        for day in days:
            for period in periods:
                normal[(requirement.id, day, period)] = model.NewBoolVar(
                    f"normal_{requirement.id}_{day}_{period}"
                )

    for block in state.split_course_blocks:
        for day in days:
            for period in periods:
                split[(block.id, day, period)] = model.NewBoolVar(
                    f"split_{block.id}_{day}_{period}"
                )

    for requirement in state.course_requirements:
        variables = [
            normal[(requirement.id, day, period)]
            for day in days
            for period in periods
        ]
        model.Add(sum(variables) == requirement.periods_per_week)
        _add_consecutive_constraints(model, state, requirement, normal)

    for block in state.split_course_blocks:
        variables = [
            split[(block.id, day, period)]
            for day in days
            for period in periods
        ]
        model.Add(sum(variables) == block.periods_per_week)

    class_variables = _class_slot_variables(state, normal, split)
    for variables in class_variables.values():
        model.Add(sum(variables) <= 1)

    teacher_variables = _teacher_slot_variables(state, normal, split)
    for variables in teacher_variables.values():
        model.Add(sum(variables) <= 1)

    room_variables = _room_slot_variables(state, normal, split)
    for variables in room_variables.values():
        model.Add(sum(variables) <= 1)

    for requirement in state.course_requirements:
        for slot in requirement.fixed_slots:
            if (
                0 <= slot.weekday < state.settings.working_days
                and 0 <= slot.period < state.settings.periods_per_day
            ):
                model.Add(normal[(requirement.id, slot.weekday, slot.period)] == 1)

    _add_unavailability_constraints(model, state, normal, split)
    _add_daily_subject_constraints(model, state, normal, split)
    penalties = _add_soft_objective_terms(
        model,
        state,
        normal,
        class_variables,
    )
    if penalties:
        model.Minimize(sum(penalties))

    solver = cp_model.CpSolver()
    solver.parameters.random_seed = 20260821
    solver.parameters.max_time_in_seconds = 30.0
    solver.parameters.num_search_workers = 1
    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        if status == cp_model.INFEASIBLE:
            diagnostics = _diagnose_infeasibility(state)
        else:
            diagnostics = [
                GenerationDiagnostic(
                    code="solver_status",
                    message=(
                        "CP-SAT did not produce a feasible timetable "
                        f"(status {solver.StatusName(status)})"
                    ),
                )
            ]
        raise GenerationError(diagnostics)

    version = TimetableVersion(
        name=name,
        effective_from=effective_from,
        class_schedules={
            school_class.id: [
                [None for _ in periods]
                for _ in days
            ]
            for school_class in state.classes
        },
    )
    _populate_solution(version, state, solver, normal, split)
    version = rebuild_resource_indexes(state, version)
    assert_valid_version(state, version)
    return version


def _add_consecutive_constraints(
    model: cp_model.CpModel,
    state: AppState,
    requirement: CourseRequirement,
    normal: Dict[VariableKey, cp_model.IntVar],
) -> None:
    block_size = requirement.consecutive_periods
    if block_size <= 1:
        return

    starts: Dict[Tuple[int, int], cp_model.IntVar] = {}
    last_start = state.settings.periods_per_day - block_size
    for day in range(state.settings.working_days):
        for period in range(last_start + 1):
            starts[(day, period)] = model.NewBoolVar(
                f"start_{requirement.id}_{day}_{period}"
            )

    model.Add(
        sum(starts.values())
        == requirement.periods_per_week // block_size
    )
    for day in range(state.settings.working_days):
        for period in range(state.settings.periods_per_day):
            covering_starts = [
                start
                for (start_day, start_period), start in starts.items()
                if start_day == day
                and start_period <= period < start_period + block_size
            ]
            model.Add(
                normal[(requirement.id, day, period)]
                == sum(covering_starts)
            )


def _class_slot_variables(
    state: AppState,
    normal: Dict[VariableKey, cp_model.IntVar],
    split: Dict[VariableKey, cp_model.IntVar],
) -> DefaultDict[Tuple[str, int, int], List[cp_model.IntVar]]:
    variables: DefaultDict[
        Tuple[str, int, int], List[cp_model.IntVar]
    ] = defaultdict(list)
    for requirement in state.course_requirements:
        for day in range(state.settings.working_days):
            for period in range(state.settings.periods_per_day):
                variables[(requirement.class_id, day, period)].append(
                    normal[(requirement.id, day, period)]
                )
    for block in state.split_course_blocks:
        for class_id in block.source_class_ids:
            for day in range(state.settings.working_days):
                for period in range(state.settings.periods_per_day):
                    variables[(class_id, day, period)].append(
                        split[(block.id, day, period)]
                    )
    return variables


def _teacher_slot_variables(
    state: AppState,
    normal: Dict[VariableKey, cp_model.IntVar],
    split: Dict[VariableKey, cp_model.IntVar],
) -> DefaultDict[Tuple[str, int, int], List[cp_model.IntVar]]:
    variables: DefaultDict[
        Tuple[str, int, int], List[cp_model.IntVar]
    ] = defaultdict(list)
    for requirement in state.course_requirements:
        for day in range(state.settings.working_days):
            for period in range(state.settings.periods_per_day):
                variables[(requirement.teacher_id, day, period)].append(
                    normal[(requirement.id, day, period)]
                )
    for block in state.split_course_blocks:
        for group in block.groups:
            for day in range(state.settings.working_days):
                for period in range(state.settings.periods_per_day):
                    variables[(group.teacher_id, day, period)].append(
                        split[(block.id, day, period)]
                    )
    return variables


def _room_slot_variables(
    state: AppState,
    normal: Dict[VariableKey, cp_model.IntVar],
    split: Dict[VariableKey, cp_model.IntVar],
) -> DefaultDict[Tuple[str, int, int], List[cp_model.IntVar]]:
    variables: DefaultDict[
        Tuple[str, int, int], List[cp_model.IntVar]
    ] = defaultdict(list)
    for requirement in state.course_requirements:
        if requirement.room_id is None:
            continue
        for day in range(state.settings.working_days):
            for period in range(state.settings.periods_per_day):
                variables[(requirement.room_id, day, period)].append(
                    normal[(requirement.id, day, period)]
                )
    for block in state.split_course_blocks:
        for group in block.groups:
            for day in range(state.settings.working_days):
                for period in range(state.settings.periods_per_day):
                    variables[(group.room_id, day, period)].append(
                        split[(block.id, day, period)]
                    )
    return variables


def _add_unavailability_constraints(
    model: cp_model.CpModel,
    state: AppState,
    normal: Dict[VariableKey, cp_model.IntVar],
    split: Dict[VariableKey, cp_model.IntVar],
) -> None:
    unavailable = {
        teacher.id: {
            (slot.weekday, slot.period)
            for slot in teacher.weekly_unavailable_slots
        }
        for teacher in state.teachers
    }
    for requirement in state.course_requirements:
        for day, period in unavailable.get(requirement.teacher_id, set()):
            if (
                0 <= day < state.settings.working_days
                and 0 <= period < state.settings.periods_per_day
            ):
                model.Add(normal[(requirement.id, day, period)] == 0)
    for block in state.split_course_blocks:
        blocked_slots = set().union(
            *(
                unavailable.get(group.teacher_id, set())
                for group in block.groups
            )
        )
        for day, period in blocked_slots:
            if (
                0 <= day < state.settings.working_days
                and 0 <= period < state.settings.periods_per_day
            ):
                model.Add(split[(block.id, day, period)] == 0)


def _add_daily_subject_constraints(
    model: cp_model.CpModel,
    state: AppState,
    normal: Dict[VariableKey, cp_model.IntVar],
    split: Dict[VariableKey, cp_model.IntVar],
) -> None:
    requirements_by_subject: DefaultDict[
        Tuple[str, str], List[CourseRequirement]
    ] = defaultdict(list)
    for requirement in state.course_requirements:
        requirements_by_subject[
            (requirement.class_id, requirement.subject_id)
        ].append(requirement)

    for (class_id, subject_id), requirements in requirements_by_subject.items():
        for day in range(state.settings.working_days):
            variables = [
                normal[(requirement.id, day, period)]
                for requirement in requirements
                for period in range(state.settings.periods_per_day)
            ]
            model.Add(
                sum(variables) <= state.settings.max_daily_subject_periods
            )

    for block in state.split_course_blocks:
        for day in range(state.settings.working_days):
            variables = [
                split[(block.id, day, period)]
                for period in range(state.settings.periods_per_day)
            ]
            model.Add(
                sum(variables) <= state.settings.max_daily_subject_periods
            )


def _add_soft_objective_terms(
    model: cp_model.CpModel,
    state: AppState,
    normal: Dict[VariableKey, cp_model.IntVar],
    class_variables: DefaultDict[
        Tuple[str, int, int], List[cp_model.IntVar]
    ],
) -> List[cp_model.LinearExpr]:
    penalties: List[cp_model.LinearExpr] = []
    occupied: Dict[Tuple[str, int, int], cp_model.IntVar] = {}
    for school_class in state.classes:
        for day in range(state.settings.working_days):
            for period in range(state.settings.periods_per_day):
                variable = model.NewBoolVar(
                    f"occupied_{school_class.id}_{day}_{period}"
                )
                model.Add(
                    variable
                    == sum(class_variables[(school_class.id, day, period)])
                )
                occupied[(school_class.id, day, period)] = variable

    for school_class in state.classes:
        for day in range(state.settings.working_days):
            for period in range(1, state.settings.periods_per_day - 1):
                previous = occupied[(school_class.id, day, period - 1)]
                current = occupied[(school_class.id, day, period)]
                following = occupied[(school_class.id, day, period + 1)]
                gap = model.NewBoolVar(
                    f"gap_{school_class.id}_{day}_{period}"
                )
                model.Add(gap <= previous)
                model.Add(gap <= following)
                model.Add(gap + current <= 1)
                model.Add(gap >= previous + following - current - 1)
                penalties.append(gap * 10)

    for teacher in state.teachers:
        if not teacher.homeroom_class_id or not teacher.main_subject_id:
            continue
        matching = [
            requirement
            for requirement in state.course_requirements
            if requirement.class_id == teacher.homeroom_class_id
            and requirement.subject_id == teacher.main_subject_id
            and requirement.teacher_id == teacher.id
        ]
        if not matching:
            continue
        for day in range(state.settings.working_days):
            first_period = [
                normal[(requirement.id, day, 0)]
                for requirement in matching
            ]
            missed = model.NewBoolVar(
                f"missed_main_subject_{teacher.id}_{day}"
            )
            model.Add(missed + sum(first_period) == 1)
            penalties.append(missed)
    return penalties


def _populate_solution(
    version: TimetableVersion,
    state: AppState,
    solver: cp_model.CpSolver,
    normal: Dict[VariableKey, cp_model.IntVar],
    split: Dict[VariableKey, cp_model.IntVar],
) -> None:
    for requirement in state.course_requirements:
        for day in range(state.settings.working_days):
            for period in range(state.settings.periods_per_day):
                if solver.Value(normal[(requirement.id, day, period)]):
                    version.class_schedules[requirement.class_id][day][
                        period
                    ] = LessonCell(
                        kind="lesson",
                        requirement_id=requirement.id,
                    )
    for block in state.split_course_blocks:
        for day in range(state.settings.working_days):
            for period in range(state.settings.periods_per_day):
                if not solver.Value(split[(block.id, day, period)]):
                    continue
                for class_id in block.source_class_ids:
                    version.class_schedules[class_id][day][period] = LessonCell(
                        kind="split",
                        split_block_id=block.id,
                    )


def _invalid_consecutive_diagnostics(
    state: AppState,
) -> List[GenerationDiagnostic]:
    diagnostics = []
    for requirement in state.course_requirements:
        block_size = requirement.consecutive_periods
        if (
            requirement.periods_per_week % block_size
            or block_size > state.settings.periods_per_day
        ):
            diagnostics.append(
                GenerationDiagnostic(
                    code="consecutive_periods",
                    message=(
                        f"Requirement {requirement.id} cannot be divided into "
                        f"complete blocks of {block_size} period(s)"
                    ),
                    entity_ids=[requirement.id],
                    required=requirement.periods_per_week,
                )
            )
    return diagnostics


def _diagnose_infeasibility(
    state: AppState,
) -> List[GenerationDiagnostic]:
    diagnostics: List[GenerationDiagnostic] = []
    total_slots = (
        state.settings.working_days * state.settings.periods_per_day
    )

    class_load: DefaultDict[str, int] = defaultdict(int)
    for requirement in state.course_requirements:
        class_load[requirement.class_id] += requirement.periods_per_week
    for block in state.split_course_blocks:
        for class_id in block.source_class_ids:
            class_load[class_id] += block.periods_per_week
    for class_id, required in class_load.items():
        if required > total_slots:
            diagnostics.append(
                _capacity_diagnostic(
                    "class_capacity",
                    "Class",
                    class_id,
                    required,
                    total_slots,
                )
            )

    unavailable_counts = {
        teacher.id: len(
            {
                (slot.weekday, slot.period)
                for slot in teacher.weekly_unavailable_slots
                if 0 <= slot.weekday < state.settings.working_days
                and 0 <= slot.period < state.settings.periods_per_day
            }
        )
        for teacher in state.teachers
    }
    teacher_load: DefaultDict[str, int] = defaultdict(int)
    for requirement in state.course_requirements:
        teacher_load[requirement.teacher_id] += requirement.periods_per_week
    for block in state.split_course_blocks:
        for group in block.groups:
            teacher_load[group.teacher_id] += block.periods_per_week
    for teacher_id, required in teacher_load.items():
        available = total_slots - unavailable_counts.get(teacher_id, 0)
        if required > available:
            diagnostics.append(
                _capacity_diagnostic(
                    "teacher_capacity",
                    "Teacher",
                    teacher_id,
                    required,
                    available,
                )
            )

    room_load: DefaultDict[str, int] = defaultdict(int)
    for requirement in state.course_requirements:
        if requirement.room_id:
            room_load[requirement.room_id] += requirement.periods_per_week
    for block in state.split_course_blocks:
        for group in block.groups:
            room_load[group.room_id] += block.periods_per_week
    for room_id, required in room_load.items():
        if required > total_slots:
            diagnostics.append(
                _capacity_diagnostic(
                    "room_capacity",
                    "Room",
                    room_id,
                    required,
                    total_slots,
                )
            )

    daily_subject_load: DefaultDict[Tuple[str, str], int] = defaultdict(int)
    for requirement in state.course_requirements:
        daily_subject_load[
            (requirement.class_id, requirement.subject_id)
        ] += requirement.periods_per_week
    subject_capacity = (
        state.settings.working_days
        * state.settings.max_daily_subject_periods
    )
    for (class_id, subject_id), required in daily_subject_load.items():
        if required > subject_capacity:
            diagnostics.append(
                GenerationDiagnostic(
                    code="daily_subject_capacity",
                    message=(
                        f"Subject {subject_id} for class {class_id} requires "
                        f"{required} slots but only {subject_capacity} satisfy "
                        "the daily subject limit"
                    ),
                    entity_ids=[class_id, subject_id],
                    required=required,
                    available=subject_capacity,
                )
            )

    for requirement in state.course_requirements:
        block_size = requirement.consecutive_periods
        consecutive_capacity = (
            state.settings.working_days
            * (state.settings.periods_per_day // block_size)
            * block_size
        )
        if requirement.periods_per_week > consecutive_capacity:
            diagnostics.append(
                GenerationDiagnostic(
                    code="consecutive_capacity",
                    message=(
                        f"Requirement {requirement.id} needs "
                        f"{requirement.periods_per_week} consecutive slots but "
                        f"only {consecutive_capacity} can fit"
                    ),
                    entity_ids=[requirement.id],
                    required=requirement.periods_per_week,
                    available=consecutive_capacity,
                )
            )

    for block in state.split_course_blocks:
        duplicate_teachers = _duplicates(
            group.teacher_id for group in block.groups
        )
        duplicate_rooms = _duplicates(group.room_id for group in block.groups)
        if duplicate_teachers or duplicate_rooms:
            diagnostics.append(
                GenerationDiagnostic(
                    code="split_resource_clash",
                    message=(
                        f"Split block {block.id} reuses a teacher or room "
                        "within the synchronized groups"
                    ),
                    entity_ids=[
                        block.id,
                        *duplicate_teachers,
                        *duplicate_rooms,
                    ],
                )
            )

    if not diagnostics:
        diagnostics.append(
            GenerationDiagnostic(
                code="model_infeasible",
                message=(
                    "The timetable constraints cannot all be satisfied; "
                    "no single capacity bottleneck was identified"
                ),
            )
        )
    return diagnostics


def _capacity_diagnostic(
    code: str,
    resource_kind: str,
    resource_id: str,
    required: int,
    available: int,
) -> GenerationDiagnostic:
    return GenerationDiagnostic(
        code=code,
        message=(
            f"{resource_kind} {resource_id} requires {required} slots but "
            f"only {available} are available"
        ),
        entity_ids=[resource_id],
        required=required,
        available=available,
    )


def _duplicates(values: Iterable[str]) -> List[str]:
    seen = set()
    duplicates = []
    for value in values:
        if value in seen and value not in duplicates:
            duplicates.append(value)
        seen.add(value)
    return duplicates
