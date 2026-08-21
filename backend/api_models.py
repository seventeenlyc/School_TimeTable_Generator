from datetime import date
from typing import List

from pydantic import BaseModel, Field

from domain import (
    ChangeEvent,
    ChangeProposal,
    ClassSchedules,
    CourseRequirement,
    Room,
    SchoolClass,
    Settings,
    SplitCourseBlock,
    Subject,
    Teacher,
    TimetableVersion,
)


class RevisionedRequest(BaseModel):
    base_revision: int = Field(ge=0)


class CatalogUpdate(RevisionedRequest):
    teachers: List[Teacher]
    classes: List[SchoolClass]
    subjects: List[Subject]
    rooms: List[Room]
    course_requirements: List[CourseRequirement]
    split_course_blocks: List[SplitCourseBlock]


class SettingsUpdate(RevisionedRequest):
    settings: Settings


class GenerateRequest(BaseModel):
    name: str = Field(min_length=1)
    effective_from: date


class SaveVersionRequest(RevisionedRequest):
    version: TimetableVersion


class CreateChildVersionRequest(RevisionedRequest):
    name: str = Field(min_length=1)
    effective_from: date
    class_schedules: ClassSchedules


class ChangeProposalRequest(BaseModel):
    event: ChangeEvent


class ApplyChangeRequest(BaseModel):
    proposal: ChangeProposal
