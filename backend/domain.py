from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Dict, List, Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, root_validator


def new_id() -> str:
    return str(uuid4())


def local_now() -> datetime:
    return datetime.now().astimezone()


def to_camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(part.capitalize() for part in tail)


class DomainModel(BaseModel):
    class Config:
        alias_generator = to_camel
        allow_population_by_field_name = True


class Slot(DomainModel):
    weekday: int = Field(ge=0, le=5)
    period: int = Field(ge=0)


class DateSlot(DomainModel):
    date: date
    period: int = Field(ge=0)


class Settings(DomainModel):
    working_days: int = Field(default=6, const=True)
    periods_per_day: int = Field(default=8, ge=1, le=20)
    long_absence_days: int = Field(default=28, ge=1)
    max_daily_subject_periods: int = Field(default=2, ge=1)
    backup_limit: int = Field(default=20, ge=1)


class Subject(DomainModel):
    id: str = Field(default_factory=new_id)
    name: str = Field(min_length=1)


class SchoolClass(DomainModel):
    id: str = Field(default_factory=new_id)
    name: str = Field(min_length=1)


class Room(DomainModel):
    id: str = Field(default_factory=new_id)
    name: str = Field(min_length=1)


class Teacher(DomainModel):
    id: str = Field(default_factory=new_id)
    name: str = Field(min_length=1)
    qualified_subject_ids: List[str] = Field(default_factory=list)
    teaching_assignment_ids: List[str] = Field(default_factory=list)
    weekly_unavailable_slots: List[Slot] = Field(default_factory=list)
    homeroom_class_id: Optional[str] = None
    main_subject_id: Optional[str] = None


class CourseRequirement(DomainModel):
    id: str = Field(default_factory=new_id)
    class_id: str
    subject_id: str
    teacher_id: str
    periods_per_week: int = Field(ge=1)
    room_id: Optional[str] = None
    consecutive_periods: int = Field(default=1, ge=1)


class SplitCourseGroup(DomainModel):
    id: str = Field(default_factory=new_id)
    subject_id: str
    teacher_id: str
    room_id: str


class SplitCourseBlock(DomainModel):
    id: str = Field(default_factory=new_id)
    name: str = Field(min_length=1)
    source_class_ids: List[str] = Field(min_items=2)
    periods_per_week: int = Field(ge=1)
    groups: List[SplitCourseGroup] = Field(min_items=2)


class LessonCell(DomainModel):
    kind: Literal["lesson", "split"]
    requirement_id: Optional[str] = None
    split_block_id: Optional[str] = None

    @root_validator
    def require_one_reference(cls, values):
        kind = values.get("kind")
        requirement_id = values.get("requirement_id")
        split_block_id = values.get("split_block_id")
        valid = (
            kind == "lesson" and requirement_id is not None and split_block_id is None
        ) or (
            kind == "split" and split_block_id is not None and requirement_id is None
        )
        if not valid:
            raise ValueError("lesson cells require one reference matching their kind")
        return values


ClassSchedules = Dict[str, List[List[Optional[LessonCell]]]]


class ResourceAssignment(DomainModel):
    target_kind: Literal["requirement", "split_group"]
    target_id: str
    class_ids: List[str]
    subject_id: str
    teacher_id: str
    room_id: Optional[str] = None


ResourceSchedules = Dict[str, List[List[Optional[ResourceAssignment]]]]


class TimetableVersion(DomainModel):
    id: str = Field(default_factory=new_id)
    name: str = Field(min_length=1)
    effective_from: date
    parent_version_id: Optional[str] = None
    class_schedules: ClassSchedules
    teacher_schedules: ResourceSchedules = Field(default_factory=dict)
    room_schedules: ResourceSchedules = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=local_now)
    source_change_event_id: Optional[str] = None


class ChangeEventKind(str, Enum):
    ABSENCE = "absence"
    BUSY = "busy"


class ChangeEventStatus(str, Enum):
    PENDING = "pending"
    PROCESSED = "processed"


class ChangeEvent(DomainModel):
    id: str = Field(default_factory=new_id)
    kind: ChangeEventKind
    teacher_id: str
    reason: str = ""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    busy_slots: List[DateSlot] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=local_now)
    status: ChangeEventStatus = Field(default=ChangeEventStatus.PENDING)

    @root_validator
    def validate_variant(cls, values):
        kind = values.get("kind")
        start_date = values.get("start_date")
        end_date = values.get("end_date")
        busy_slots = values.get("busy_slots") or []
        if kind == ChangeEventKind.ABSENCE:
            if start_date is None or end_date is None or end_date < start_date:
                raise ValueError("absence requires an ordered date range")
            if busy_slots:
                raise ValueError("absence cannot contain busy slots")
        if kind == ChangeEventKind.BUSY:
            if not busy_slots:
                raise ValueError("busy requires at least one date slot")
            if start_date is not None or end_date is not None:
                raise ValueError("busy cannot contain an absence date range")
        return values


class CellOverride(DomainModel):
    date: date
    class_id: str
    period: int = Field(ge=0)
    before: Optional[LessonCell]
    after: Optional[LessonCell]


class TeacherSubstitution(DomainModel):
    date: date
    period: int = Field(ge=0)
    target_kind: Literal["requirement", "split_group"]
    target_id: str
    original_teacher_id: str
    substitute_teacher_id: str


class DateException(DomainModel):
    date: date
    cell_overrides: List[CellOverride] = Field(default_factory=list)
    teacher_substitutions: List[TeacherSubstitution] = Field(default_factory=list)


class ChangeOperation(DomainModel):
    date: date
    period: int = Field(ge=0)
    class_ids: List[str]
    kind: Literal["swap", "substitute", "move_split_block"]
    before_label: str
    after_label: str


class ProposalScore(DomainModel):
    strategy_tier: int = Field(ge=0)
    changed_cells: int = Field(ge=0)
    affected_classes: int = Field(ge=0)
    affected_teachers: int = Field(ge=0)
    moved_split_blocks: int = Field(ge=0)
    slot_distance: int = Field(ge=0)


class ChangeProposal(DomainModel):
    id: str = Field(default_factory=new_id)
    base_revision: int = Field(ge=0)
    base_version_id: str
    event: ChangeEvent
    strategy: str
    explanation: str
    score: ProposalScore
    operations: List[ChangeOperation]
    date_exceptions: List[DateException]
    version_candidate: Optional[TimetableVersion] = None
    warnings: List[str] = Field(default_factory=list)


class AppliedChange(DomainModel):
    id: str = Field(default_factory=new_id)
    event: ChangeEvent
    proposal_id: str
    base_version_id: str
    strategy: str
    score: ProposalScore
    operations: List[ChangeOperation]
    date_exceptions: List[DateException]
    new_version_id: Optional[str] = None
    applied_at: datetime = Field(default_factory=local_now)


class AppState(DomainModel):
    schema_version: int = Field(default=1, const=True)
    revision: int = Field(default=0, ge=0)
    settings: Settings = Field(default_factory=Settings)
    teachers: List[Teacher] = Field(default_factory=list)
    classes: List[SchoolClass] = Field(default_factory=list)
    subjects: List[Subject] = Field(default_factory=list)
    rooms: List[Room] = Field(default_factory=list)
    course_requirements: List[CourseRequirement] = Field(default_factory=list)
    split_course_blocks: List[SplitCourseBlock] = Field(default_factory=list)
    timetable_versions: List[TimetableVersion] = Field(default_factory=list)
    change_events: List[ChangeEvent] = Field(default_factory=list)
    applied_changes: List[AppliedChange] = Field(default_factory=list)