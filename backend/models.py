from typing import Dict, List, Optional
from pydantic import BaseModel
from dataclasses import dataclass

# Pydantic models for API input
class InputTeacher(BaseModel):
    name: str
    subjects_by_class: Dict[str, Dict[str, int]]  # class -> subject -> number of periods
    main_subject: str
    assigned_class: Optional[str] = None
    lab_subjects: Optional[List[str]] = []
    unavailable_slots: Optional[List[List[int]]] = []  # List of [dayIndex, periodIndex]

# Dataclass models for internal use
@dataclass
class Teacher:
    name: str
    subjects_by_class: Dict[str, Dict[str, int]]  # class -> subject -> periods
    main_subject: str
    assigned_class: Optional[str] = None
    lab_subjects: set = None
    unavailable_slots: List[List[int]] = None
    
    def __post_init__(self):
        if self.lab_subjects is None:
            self.lab_subjects = set()
        if self.unavailable_slots is None:
            self.unavailable_slots = []

@dataclass
class Timetable:
    data: Dict[str, List[List[Optional[str]]]]  # key: class or teacher -> [day][period]