# Local Timetable Scheduling Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有项目重构为无需登录、使用本地 JSON 的单机课表系统，并实现可预览、确认后执行的规则 + OR-Tools 调课 Agent。

**Architecture:** 后端使用结构化 Pydantic 领域模型作为唯一数据契约，由 JSON 仓库、统一校验器、周课表求解器、日期版本服务和局部调课 Agent 分层协作。前端改用无鉴权 API 客户端，根路径直接进入管理页，所有生成、编辑和调课都通过不可变版本或日期例外保存。

**Tech Stack:** Python 3.11、FastAPI 0.111、Pydantic 1.10、OR-Tools CP-SAT 9.14、pytest、React 19、Vite 7、React Router 7、Vitest、Testing Library。

**Spec:** `docs/superpowers/specs/2026-08-21-timetable-agent-design.md`

## Global Constraints

- 系统只在一台 Windows 电脑上运行，不实现账号、多用户权限、云同步或网络协同。
- 基础课表固定为周一至周六；真实日期只映射星期，星期日无课程，不处理节假日和调休。
- 缺勤表示起止日期内全天不能授课；繁忙只封锁指定真实日期和课节。
- 繁忙的策略顺序必须是班内换课、同科代课、局部调整。
- 缺勤的策略顺序必须是原课节同科代课、为了同科代课进行班内调课、局部调整。
- 代课教师必须具备对应科目资格；不允许把课程延期到教师恢复以后。
- 每个班每周各科课时必须保持不变；无完整方案时返回无解，不保存部分方案。
- 走班块移动时必须整体同步；只有对应分组的教师代课可以单独替换。
- 长期缺勤阈值默认 28 个自然日；长期调课版本在教师恢复后继续生效。
- Agent 候选方案未确认时不得写入 JSON；应用时必须校验 `base_revision` 并重新执行完整校验。
- 正式数据文件固定为 `backend/data/timetable-data.json`，写入使用临时文件 + `os.replace`，保留最近 20 份备份。
- 删除 Clerk、MongoDB、`userId` 和所有必需的外部密钥；不自动迁移 MongoDB 历史数据。

## Scope Decision

存储、领域模型、求解器、Agent、API 和前端不是可独立交付的产品，它们共同组成同一个本地课表工作流，因此使用一个按依赖排序的计划。每个任务都产生可单独测试和审查的提交；后端新接口完成后才切换前端，旧代码在最终清理任务中删除。

## Target File Structure

### Backend

- `backend/domain.py`：所有持久化实体、请求结果实体和枚举。
- `backend/repository.py`：JSON 加载、模式验证、revision、原子写入和备份恢复。
- `backend/validation.py`：基础版本、日期例外和候选方案共用的硬约束校验。
- `backend/schedule_service.py`：生效版本选择、日期/周解析和日期例外叠加。
- `backend/base_solver.py`：基础周课表 CP-SAT 模型。
- `backend/change_agent.py`：事件分析、策略分层、候选方案组合和解释。
- `backend/local_optimizer.py`：受影响周的 CP-SAT 局部优化和备选解生成。
- `backend/api_models.py`：只属于 HTTP 边界的请求模型。
- `backend/server.py`：应用工厂、路由和 HTTP 错误映射。
- `backend/tests/`：按上述模块划分的 pytest 测试。

### Frontend

- `frontend/src/api/client.js`：无鉴权 JSON API 客户端。
- `frontend/src/domain/schedule.js`：结构化课表展示和差异格式化工具。
- `frontend/src/pages/dashboard/DashboardPage.jsx`：启动页和版本列表。
- `frontend/src/pages/catalog/CatalogPage.jsx`：班级、科目、教师、教室和课时设置。
- `frontend/src/pages/catalog/SplitCourseBlockEditor.jsx`：同步走班块编辑器。
- `frontend/src/pages/generate/GeneratePage.jsx`：基础课表生成和确认保存。
- `frontend/src/pages/timetable/TimetablePage.jsx`：按版本或真实日期查看课表。
- `frontend/src/pages/timetable/EditTimetablePage.jsx`：结构化课表编辑并创建子版本。
- `frontend/src/pages/agent/ChangeAgentPage.jsx`：缺勤/繁忙输入、方案预览和确认。
- `frontend/src/pages/agent/ProposalCard.jsx`：候选方案评分与差异展示。
- `frontend/src/components/ScheduleGrid.jsx`：普通课程与走班块共用的表格。

---

### Task 1: Establish the backend domain contract and pytest harness

**Files:**
- Create: `backend/domain.py`
- Create: `backend/requirements-dev.txt`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_domain.py`

**Interfaces:**
- Produces: `AppState`, `Settings`, `Teacher`, `SchoolClass`, `Subject`, `Room`, `CourseRequirement`, `SplitCourseBlock`, `LessonCell`, `ResourceAssignment`, `TimetableVersion`, `ChangeEvent`, `DateException`, `ChangeProposal`, `AppliedChange`, `new_id()`.
- Consumes: no application code; only Pydantic 1.10 and Python standard library.

- [ ] **Step 1: Add the isolated test dependencies and import path setup**

Create `backend/requirements-dev.txt`:

```text
pytest==8.4.1
httpx==0.28.1
```

Create `backend/tests/conftest.py`:

```python
from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
```

Install once:

```powershell
$env:PYTHONUTF8='1'
& 'backend\venv\Scripts\python.exe' -m pip install -r backend\requirements-dev.txt
```

- [ ] **Step 2: Write failing domain validation tests**

Create `backend/tests/test_domain.py` with tests that prove event variants and structured cells cannot be ambiguous:

```python
from datetime import date

import pytest
from pydantic import ValidationError

from domain import ChangeEvent, ChangeEventKind, DateSlot, LessonCell, Settings


def test_absence_requires_an_ordered_date_range():
    with pytest.raises(ValidationError):
        ChangeEvent(
            kind=ChangeEventKind.ABSENCE,
            teacher_id="teacher-1",
            start_date=date(2026, 9, 10),
            end_date=date(2026, 9, 1),
        )


def test_busy_requires_real_date_slots():
    event = ChangeEvent(
        kind=ChangeEventKind.BUSY,
        teacher_id="teacher-1",
        busy_slots=[DateSlot(date=date(2026, 9, 2), period=1)],
    )
    assert event.start_date is None
    assert event.busy_slots[0].period == 1


def test_lesson_cell_accepts_exactly_one_reference():
    with pytest.raises(ValidationError):
        LessonCell(kind="lesson", requirement_id="req-1", split_block_id="block-1")

    cell = LessonCell(kind="split", split_block_id="block-1")
    assert cell.requirement_id is None


def test_settings_are_fixed_to_monday_through_saturday():
    settings = Settings(periods_per_day=8)
    assert settings.working_days == 6
    assert settings.long_absence_days == 28
    assert settings.dict(by_alias=True)["longAbsenceDays"] == 28
```

- [ ] **Step 3: Run the tests and confirm the module is missing**

Run:

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_domain.py -q
```

Expected: collection fails with `ModuleNotFoundError: No module named 'domain'`.

- [ ] **Step 4: Implement the complete persisted and proposal models**

Implement these exact public shapes in `backend/domain.py`. Python and HTTP payloads use snake_case; the JSON repository serializes domain aliases in camelCase to match the approved storage schema:

```python
from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Dict, List, Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, root_validator, validator


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


class ChangeEvent(DomainModel):
    id: str = Field(default_factory=new_id)
    kind: ChangeEventKind
    teacher_id: str
    reason: str = ""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    busy_slots: List[DateSlot] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=local_now)

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
```

- [ ] **Step 5: Run the domain tests**

Run:

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_domain.py -q
```

Expected: `4 passed`.

- [ ] **Step 6: Commit the domain contract**

```powershell
git add backend/domain.py backend/requirements-dev.txt backend/tests/conftest.py backend/tests/test_domain.py
git commit -m "feat: add structured timetable domain models"
```

---

### Task 2: Implement atomic JSON persistence and backup recovery

**Files:**
- Create: `backend/repository.py`
- Create: `backend/tests/test_repository.py`

**Interfaces:**
- Consumes: `AppState` from Task 1.
- Produces: `JsonRepository.load()`, `JsonRepository.save(state, base_revision)`, `JsonRepository.mutate(base_revision, mutation)`, `JsonRepository.list_backups()`, `JsonRepository.restore_backup(name)`, `RevisionConflict`, `DataFileError`.

- [ ] **Step 1: Write failing repository tests**

Create tests using `tmp_path`:

```python
import json
from pathlib import Path

import pytest

from domain import AppState, SchoolClass
from repository import DataFileError, JsonRepository, RevisionConflict


def test_first_load_creates_a_valid_empty_state(tmp_path: Path):
    repository = JsonRepository(tmp_path / "timetable-data.json")
    state = repository.load()
    assert state.schema_version == 1
    assert state.revision == 0
    stored = json.loads((tmp_path / "timetable-data.json").read_text("utf-8"))
    assert stored["schemaVersion"] == 1
    assert stored["revision"] == 0


def test_save_is_revision_checked_and_creates_a_backup(tmp_path: Path):
    repository = JsonRepository(tmp_path / "timetable-data.json")
    first = repository.load()
    first.classes.append(SchoolClass(id="class-1", name="1班"))
    saved = repository.save(first, base_revision=0)
    assert saved.revision == 1

    saved.classes.append(SchoolClass(id="class-2", name="2班"))
    repository.save(saved, base_revision=1)
    assert len(repository.list_backups()) == 1

    with pytest.raises(RevisionConflict):
        repository.save(saved, base_revision=0)


def test_corrupt_json_is_never_overwritten(tmp_path: Path):
    path = tmp_path / "timetable-data.json"
    path.write_text("{broken", encoding="utf-8")
    repository = JsonRepository(path)
    with pytest.raises(DataFileError):
        repository.load()
    assert path.read_text("utf-8") == "{broken"


def test_restore_validates_backup_and_increments_revision(tmp_path: Path):
    repository = JsonRepository(tmp_path / "timetable-data.json")
    first = repository.load()
    first.classes.append(SchoolClass(id="class-1", name="1班"))
    repository.save(first, base_revision=0)
    first_backup = repository.list_backups()[0]
    restored = repository.restore_backup(first_backup.name)
    assert restored.revision == 2


def test_restore_can_recover_a_corrupt_current_file(tmp_path: Path):
    repository = JsonRepository(tmp_path / "timetable-data.json")
    state = repository.load()
    state.classes.append(SchoolClass(id="class-1", name="1班"))
    repository.save(state, base_revision=0)
    backup = repository.list_backups()[0]
    repository.path.write_text("{broken", encoding="utf-8")
    restored = repository.restore_backup(backup.name)
    assert restored.schema_version == 1
    assert repository.load().revision == restored.revision
```

- [ ] **Step 2: Run the repository tests and verify failure**

Run:

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_repository.py -q
```

Expected: collection fails because `repository` does not exist.

- [ ] **Step 3: Implement repository initialization and locked loads**

Create `JsonRepository` with these invariants:

```python
class JsonRepository:
    def __init__(self, path: Path, backup_limit: int = 20):
        self.path = path
        self.backup_dir = path.parent / "backups"
        self.backup_limit = backup_limit
        self._lock = threading.RLock()

    def load(self) -> AppState:
        with self._lock:
            if not self.path.exists():
                self.path.parent.mkdir(parents=True, exist_ok=True)
                return self._write_initial_state()
            try:
                return AppState.parse_raw(self.path.read_text(encoding="utf-8"))
            except (OSError, ValueError) as exc:
                raise DataFileError(str(exc)) from exc
```

`_write_initial_state()` must use the same atomic writer as later saves, but must not create a backup and must keep revision `0`.

- [ ] **Step 4: Implement revision-checked atomic saves**

Use a temporary file in the same directory so `os.replace` stays atomic:

```python
def _atomic_write(self, state: AppState) -> None:
    encoded = state.json(by_alias=True, ensure_ascii=False, indent=2)
    handle, temp_name = tempfile.mkstemp(
        dir=str(self.path.parent), prefix="timetable-", suffix=".tmp"
    )
    try:
        with os.fdopen(handle, "w", encoding="utf-8", newline="\n") as stream:
            stream.write(encoded)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp_name, self.path)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)
```

`save()` must reload the current state while holding `_lock`, compare the revision, deep-copy the supplied state, set `revision = current.revision + 1`, copy the current file to a timestamped `.json` backup, atomically write, then prune older backups until at most `backup_limit` remain.

- [ ] **Step 5: Implement mutation and restore helpers**

Use this public mutation signature:

```python
def mutate(
    self,
    base_revision: int,
    mutation: Callable[[AppState], AppState],
) -> AppState:
    with self._lock:
        current = self.load()
        if current.revision != base_revision:
            raise RevisionConflict(base_revision, current.revision)
        candidate = mutation(current.copy(deep=True))
        return self.save(candidate, base_revision)
```

`restore_backup(name)` must reject path separators and parse the selected backup as `AppState`. Under `_lock`, try to parse the current file; if it is valid, back it up and set the restored revision to one greater than the maximum current/backup revision. If it is corrupt, copy its raw bytes to a timestamped `corrupt-*.json` backup without parsing, set the restored revision to `backup.revision + 1`, and call `_atomic_write()` directly. This recovery path must not call `save()`, because `save()` intentionally refuses to overwrite corrupt current data.

- [ ] **Step 6: Run repository tests**

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_repository.py -q
```

Expected: `5 passed`.

- [ ] **Step 7: Commit the JSON repository**

```powershell
git add backend/repository.py backend/tests/test_repository.py
git commit -m "feat: persist timetable data atomically in json"
```

---

### Task 3: Add the shared structured timetable validator

**Files:**
- Create: `backend/validation.py`
- Create: `backend/tests/factories.py`
- Create: `backend/tests/test_validation_structured.py`

**Interfaces:**
- Consumes: all catalog and schedule entities from `domain.py`.
- Produces: `ValidationIssue`, `ValidationReport`, `rebuild_resource_indexes(state, version)`, `validate_catalog(state)`, `validate_timetable_version(state, version)`, `assert_valid_version(state, version)`.

- [ ] **Step 1: Create a deterministic valid-state factory**

In `backend/tests/factories.py`, create `make_two_class_state()` with fixed IDs. It must contain 1班、2班，语文、数学、地理、政治，张老师、王老师和两名普通课教师，301/302 教室，一个地理/政治同步走班块，以及 a 6 × 4 empty version. Add helper `place_lesson(version, class_id, weekday, period, requirement_id)` and `place_split(version, block, weekday, period)`.

Use fixed IDs such as `class-1`, `class-2`, `subject-geography`, `teacher-zhang`, `room-301`, `split-geography-politics` so test failures are readable.

- [ ] **Step 2: Write failing hard-constraint tests**

Cover these exact failures in `backend/tests/test_validation_structured.py`:

```python
def test_teacher_double_booking_is_reported():
    state, version = make_two_class_state()
    place_lesson(version, "class-1", 0, 0, "req-class1-math")
    place_lesson(version, "class-2", 0, 0, "req-class2-math-same-teacher")
    report = validate_timetable_version(state, version)
    assert "teacher_double_booked" in {issue.code for issue in report.errors}


def test_split_block_must_appear_for_every_source_class():
    state, version = make_two_class_state()
    version.class_schedules["class-1"][1][2] = LessonCell(
        kind="split", split_block_id="split-geography-politics"
    )
    report = validate_timetable_version(state, version)
    assert "split_block_not_synchronized" in {issue.code for issue in report.errors}


def test_weekly_subject_counts_are_exact():
    state, version = make_two_class_state()
    report = validate_timetable_version(state, version)
    assert "weekly_period_count" in {issue.code for issue in report.errors}
```

Also test unknown references, room double-booking, teacher weekly unavailability, unqualified teachers, daily subject cap and broken consecutive blocks.

- [ ] **Step 3: Run validation tests and verify failure**

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_validation_structured.py -q
```

Expected: collection fails because `validation` and `factories` do not exist.

- [ ] **Step 4: Implement validation result types and catalog indexes**

Use exact result types:

```python
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
```

Build dictionaries for teachers, classes, subjects, rooms, requirements, split blocks and split groups once per validation call. `validate_catalog()` must reject duplicate IDs/names, missing references, teacher assignment ID mismatches, unqualified assigned teachers, duplicate source classes in a block, reused rooms inside one block and periods beyond the configured week capacity.

- [ ] **Step 5: Implement timetable occupancy and count validation**

`validate_timetable_version()` must run in this order:

1. Call `validate_catalog()` and stop schedule checks if references are invalid.
2. Require every configured class to have exactly 6 rows and exactly `periods_per_day` cells per row.
3. Expand a lesson cell to its assigned teacher/room/subject; expand a split cell to every group teacher/room/subject.
4. Check teacher, room and class occupancy per `(weekday, period)`.
5. Check teacher weekly unavailable slots.
6. Check that each split block appears at identical slots in all source classes and exactly `periods_per_week` times.
7. Count every normal requirement exactly `periods_per_week` times.
8. Enforce `max_daily_subject_periods` for normal class lessons.
9. Verify each requirement with `consecutive_periods > 1` occurs only in complete adjacent blocks on one day.

`rebuild_resource_indexes(state, version)` must deep-copy the version and derive complete 6 × `periods_per_day` teacher/room schedules of `ResourceAssignment` values from `class_schedules`. `validate_timetable_version()` must compare stored indexes with a freshly rebuilt result and report `resource_index_stale` when they differ. Every writer must rebuild indexes before validating or persisting a version.

`assert_valid_version()` must raise `ScheduleValidationError(report)` when `report.valid` is false.

- [ ] **Step 6: Run structured validator tests**

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_validation_structured.py -q
```

Expected: all validator tests pass.

- [ ] **Step 7: Commit the validator**

```powershell
git add backend/validation.py backend/tests/factories.py backend/tests/test_validation_structured.py
git commit -m "feat: validate structured timetable constraints"
```

---

### Task 4: Resolve immutable versions and real-date exceptions

**Files:**
- Create: `backend/schedule_service.py`
- Create: `backend/tests/test_schedule_service.py`
- Modify: `backend/tests/factories.py`

**Interfaces:**
- Consumes: `AppState`, `TimetableVersion`, `AppliedChange`, `DateException`.
- Produces: `monday_of(value)`, `iter_school_dates(start, end)`, `get_active_version(state, on_date)`, `resolve_day(state, on_date)`, `resolve_week(state, monday)`, `create_child_version(state, parent, name, effective_from, class_schedules, source_change_event_id)`.

- [ ] **Step 1: Write failing date and version tests**

Add `make_versioned_state()` to factories with two otherwise identical valid versions effective `2026-09-01` and `2026-09-07`. Add `make_state_with_substitution_exception()` with one Math requirement/cell and one confirmed `TeacherSubstitution` on `2026-09-08`; the base requirement remains assigned to `teacher-original`.

Create these cases:

```python
from datetime import date

from schedule_service import get_active_version, iter_school_dates, resolve_day


def test_school_dates_skip_sunday_only():
    dates = list(iter_school_dates(date(2026, 8, 21), date(2026, 8, 24)))
    assert dates == [date(2026, 8, 21), date(2026, 8, 22), date(2026, 8, 24)]


def test_latest_effective_version_wins():
    state, first, second = make_versioned_state()
    assert get_active_version(state, date(2026, 9, 6)).id == first.id
    assert get_active_version(state, date(2026, 9, 7)).id == second.id


def test_date_exception_replaces_teacher_without_mutating_version():
    state = make_state_with_substitution_exception()
    day = resolve_day(state, date(2026, 9, 8))
    assert day.teacher_for("req-class1-math", period=0) == "teacher-substitute"
    assert state.course_requirements[0].teacher_id == "teacher-original"


def test_sunday_resolves_to_an_empty_school_day():
    state, version = make_two_class_state()
    state.timetable_versions.append(version)
    assert resolve_day(state, date(2026, 9, 6)).class_schedules == {}
```

- [ ] **Step 2: Run date service tests and verify failure**

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_schedule_service.py -q
```

Expected: collection fails because `schedule_service` does not exist.

- [ ] **Step 3: Implement active-version selection and date iteration**

Use local `date` values only:

```python
def monday_of(value: date) -> date:
    return value - timedelta(days=value.weekday())


def iter_school_dates(start: date, end: date) -> Iterator[date]:
    current = start
    while current <= end:
        if current.weekday() <= 5:
            yield current
        current += timedelta(days=1)


def get_active_version(state: AppState, on_date: date) -> TimetableVersion:
    matches = [v for v in state.timetable_versions if v.effective_from <= on_date]
    if not matches:
        raise NoActiveTimetable(on_date)
    return max(matches, key=lambda item: (item.effective_from, item.created_at, item.id))
```

- [ ] **Step 4: Implement resolved day/week views without mutating state**

Define `ResolvedLesson` and `ResolvedDay` Pydantic models. `resolve_day()` must deep-copy the selected weekday row, apply every confirmed `CellOverride` for the date, then apply `TeacherSubstitution` to the expanded resolved lessons. It must not write into a `TimetableVersion` or catalog entity.

Use these stable view fields:

```python
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
```

For Sunday, return `ResolvedDay(date=on_date, version_id=None, class_schedules={})`.

`resolve_week(state, monday)` must require a Monday and call `resolve_day()` for six dates, returning a list ordered Monday through Saturday.

- [ ] **Step 5: Implement immutable child-version creation**

Use this signature:

```python
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
        class_schedules=class_schedules,
        source_change_event_id=source_change_event_id,
    )
    return rebuild_resource_indexes(state, candidate)
```

- [ ] **Step 6: Run date service tests**

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_schedule_service.py -q
```

Expected: all date service tests pass.

- [ ] **Step 7: Commit date/version behavior**

```powershell
git add backend/schedule_service.py backend/tests/test_schedule_service.py backend/tests/factories.py
git commit -m "feat: resolve dated timetable versions and exceptions"
```

---

### Task 5: Build the structured base timetable CP-SAT solver

**Files:**
- Create: `backend/base_solver.py`
- Create: `backend/tests/test_base_solver.py`
- Modify: `backend/tests/factories.py`

**Interfaces:**
- Consumes: validated `AppState` catalog and `effective_from`/`name` generation inputs.
- Produces: `generate_base_timetable(state, name, effective_from) -> TimetableVersion` and `GenerationError` with structured diagnostics.

- [ ] **Step 1: Write failing solver tests**

Add `make_generation_state()` with two classes, 6 × 4 capacity, regular Math/Chinese requirements and one geography/politics split block, with one Math teacher unavailable Monday period 1. Add `make_impossible_room_state()` with 6 × 1 capacity and two six-period requirements in different classes that both require the same room, so the total room demand is 12 for six slots. Add this exact test helper:

```python
def split_slots(version, class_id, block_id):
    return {
        (day, period)
        for day, row in enumerate(version.class_schedules[class_id])
        for period, cell in enumerate(row)
        if cell is not None and cell.split_block_id == block_id
    }
```

Then assert:

```python
def test_generator_meets_weekly_counts_and_unavailability():
    state = make_generation_state()
    version = generate_base_timetable(state, "2026秋季", date(2026, 9, 1))
    report = validate_timetable_version(state, version)
    assert report.valid, report.errors
    unavailable = {(slot.weekday, slot.period) for slot in state.teachers[0].weekly_unavailable_slots}
    assert all(
        version.class_schedules["class-1"][day][period] is None
        or version.class_schedules["class-1"][day][period].requirement_id != "req-class1-math"
        for day, period in unavailable
    )


def test_generator_places_split_blocks_in_lockstep():
    state = make_generation_state()
    version = generate_base_timetable(state, "2026秋季", date(2026, 9, 1))
    class_1_slots = split_slots(version, "class-1", "split-geography-politics")
    class_2_slots = split_slots(version, "class-2", "split-geography-politics")
    assert class_1_slots == class_2_slots


def test_generator_returns_diagnostics_for_impossible_room_use():
    state = make_impossible_room_state()
    with pytest.raises(GenerationError) as exc:
        generate_base_timetable(state, "冲突", date(2026, 9, 1))
    assert "room_capacity" in {item.code for item in exc.value.diagnostics}
```

- [ ] **Step 2: Run solver tests and verify failure**

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_base_solver.py -q
```

Expected: collection fails because `base_solver` does not exist.

- [ ] **Step 3: Create assignment variables for normal and split lessons**

Use Boolean variables rather than integer-encoded subject/teacher strings:

```python
normal[(requirement.id, day, period)] = model.NewBoolVar(
    f"normal_{requirement.id}_{day}_{period}"
)
split[(block.id, day, period)] = model.NewBoolVar(
    f"split_{block.id}_{day}_{period}"
)
```

For each normal requirement, constrain the sum to `periods_per_week`. For each split block, constrain the sum to its `periods_per_week`. Every source class includes the same split variable, which guarantees synchronized placement by construction.

- [ ] **Step 4: Add class, teacher, room and availability constraints**

For each class slot, sum all normal variables for that class plus split variables whose `source_class_ids` contain the class and constrain `<= 1`. For each teacher and room slot, collect normal assignments plus all split groups using that resource and constrain `<= 1`. Force normal or split variables to zero when their teacher has the slot in `weekly_unavailable_slots`.

Model consecutive requirements using block-start Booleans. A requirement with `consecutive_periods = n` must choose `periods_per_week / n` valid starts, and each occurrence variable must equal the sum of starts covering it. Reject non-divisible input before creating the model.

- [ ] **Step 5: Add daily limits and deterministic soft objectives**

Enforce the configured daily subject cap for each class and normal subject. Add soft penalties for empty gaps between occupied periods and for missing a homeroom teacher's main subject in first period. Set `solver.parameters.random_seed = 20260821` and `solver.parameters.max_time_in_seconds = 30.0` so tests are repeatable and local runs terminate.

- [ ] **Step 6: Convert the solution to structured cells and validate it**

Create `LessonCell(kind="lesson", requirement_id=requirement.id)` or `LessonCell(kind="split", split_block_id=block.id)` in each class row. Call `rebuild_resource_indexes(state, version)` and then `assert_valid_version(state, version)` before returning. When CP-SAT reports `INFEASIBLE`, run inexpensive capacity diagnostics for class periods, teacher load, rooms, consecutive blocks and split resource clashes, then raise `GenerationError`.

- [ ] **Step 7: Run solver and shared validation tests**

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_base_solver.py backend\tests\test_validation_structured.py -q
```

Expected: all selected tests pass.

- [ ] **Step 8: Commit the structured generator**

```powershell
git add backend/base_solver.py backend/tests/test_base_solver.py backend/tests/factories.py
git commit -m "feat: generate structured weekly timetables"
```

---

### Task 6: Replace MongoDB endpoints with the local-state API

**Files:**
- Create: `backend/api_models.py`
- Rewrite: `backend/server.py`
- Modify: `backend/requirements.txt`
- Create: `backend/tests/test_api_state.py`

**Interfaces:**
- Consumes: `JsonRepository`, domain models, validator, `generate_base_timetable`.
- Produces: `create_app(data_path: Optional[Path] = None) -> FastAPI`, `/api/state`, `/api/catalog`, `/api/settings`, timetable version routes and backup routes.

- [ ] **Step 1: Write failing API tests with an isolated data path**

Inside `test_api_state.py`, implement `make_catalog_payload(base_revision)` by serializing the six catalog lists from `make_generation_state()`, and implement `prepared_client(tmp_path)` by creating the app, sending that payload to `PUT /api/catalog`, and asserting the response is 200 before returning the client.

Use FastAPI `TestClient` and `tmp_path`:

```python
def test_state_starts_without_mongo_or_auth(tmp_path):
    client = TestClient(create_app(tmp_path / "data.json"))
    response = client.get("/api/state")
    assert response.status_code == 200
    assert response.json()["revision"] == 0


def test_catalog_update_requires_matching_revision(tmp_path):
    client = TestClient(create_app(tmp_path / "data.json"))
    payload = make_catalog_payload(base_revision=0)
    assert client.put("/api/catalog", json=payload).status_code == 200
    stale = client.put("/api/catalog", json=payload)
    assert stale.status_code == 409


def test_generate_is_preview_only_until_saved(tmp_path):
    client = prepared_client(tmp_path)
    preview = client.post(
        "/api/timetables/generate",
        json={"name": "2026秋季", "effective_from": "2026-09-01"},
    )
    assert preview.status_code == 200
    assert client.get("/api/timetables").json() == []
```

Also test saving a preview, reading it by ID, creating an immutable child version, deleting a referenced parent returns 409, listing backups and restoring a backup.

- [ ] **Step 2: Run API tests and verify failure against the old server**

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_api_state.py -q
```

Expected: imports or routes fail because the existing server creates a MongoDB client and has no `create_app`.

- [ ] **Step 3: Define HTTP request models**

Create these models in `backend/api_models.py`:

```python
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
```

- [ ] **Step 4: Rewrite `server.py` as an application factory**

Remove `pymongo`, `bson`, `pytz`, raw `Request` writes and every legacy `/add`, `/get-timetables/{user_id}`, `/update-timetable/{id}` route. Use:

```python
DEFAULT_DATA_PATH = Path(__file__).resolve().parent / "data" / "timetable-data.json"


def create_app(data_path: Optional[Path] = None) -> FastAPI:
    app = FastAPI(title="Local Timetable API")
    app.state.repository = JsonRepository(data_path or DEFAULT_DATA_PATH)
    configure_cors(app)
    register_routes(app)
    register_error_handlers(app)
    return app


app = create_app()
```

Map `RevisionConflict` to HTTP 409, `ScheduleValidationError` to 422, missing entities to 404, `DataFileError` to 503, and unexpected errors to a generic 500 without returning Python tracebacks.

Return API domain payloads with `jsonable_encoder(model, by_alias=False)` so the new frontend consistently consumes snake_case, while `JsonRepository` remains the only boundary that writes camelCase aliases to disk.

- [ ] **Step 5: Implement local catalog, generation and immutable version routes**

`PUT /api/catalog` and `PUT /api/settings` must mutate only their named sections and validate before saving. `POST /api/timetables/generate` must return a version candidate without saving. `POST /api/timetables` must rebuild resource indexes, validate and append the version under a matching revision. `POST /api/timetables/{id}/versions` must create a child via `create_child_version(state, parent, ...)`; it must not mutate the parent. Delete must reject versions referenced as `parent_version_id` or `new_version_id`.

Catalog updates must validate every existing timetable version and applied change against the candidate catalog. Reject deletion or modification that would leave a historical version with missing or invalid references.

- [ ] **Step 6: Implement backup list/restore routes**

Return backup file name, size and last-modified timestamp from `GET /api/backups`. `POST /api/backups/{name}/restore` must require body `{"confirmed": true}` and return HTTP 400 otherwise.

- [ ] **Step 7: Remove database dependencies and run all backend tests**

Delete `pymongo` and `pytz` from `backend/requirements.txt`. Keep `python-dotenv` only for optional `FRONTEND_URL`; no environment variable may be required to boot.

Run:

```powershell
$env:PYTHONUTF8='1'
& 'backend\venv\Scripts\python.exe' -m pip install -r backend\requirements.txt
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests -q
```

Expected: all new backend tests pass and importing `server` does not attempt a network connection.

- [ ] **Step 8: Commit the local API**

```powershell
git add backend/api_models.py backend/server.py backend/requirements.txt backend/tests/test_api_state.py
git commit -m "feat: replace mongodb with local timetable api"
```

---

### Task 7: Implement direct absence, busy and split-course strategies

**Files:**
- Create: `backend/change_agent.py`
- Create: `backend/tests/test_change_agent_direct.py`
- Modify: `backend/tests/factories.py`

**Interfaces:**
- Consumes: resolved date/week views, catalog qualification and occupancy data.
- Produces: `affected_occurrences(state, event)`, `DirectPlanSeed`, `build_absence_seed(state, event)`, `build_busy_seed(state, event)`, and single-occurrence swap/substitution helpers.

- [ ] **Step 1: Write failing priority and qualification tests**

Add these deterministic factories:

- `make_direct_absence_case(qualified_substitute=True)`: Tuesday period 1 contains a Math lesson by `teacher-math-1`; `teacher-math-2` is free and qualified unless the flag is false; the event is a one-day absence for `teacher-math-1`.
- `make_busy_swap_and_substitute_case()`: one class has Math in period 1 and Chinese in period 2, both assigned teachers can exchange slots, and a third Math teacher is also free in period 1; the event marks the Math teacher busy only in period 1.
- `make_split_group_absence_case()`: the geography/politics split block is placed Tuesday period 1, 张老师 is absent, a second qualified geography teacher is free, and the politics teacher remains available.

Create fixtures proving:

```python
def test_absence_uses_same_subject_teacher_in_the_original_slot():
    state, event = make_direct_absence_case()
    proposal = build_absence_seed(state, event).to_complete_proposal()
    assert proposal.strategy == "absence_same_slot_substitute"
    assert proposal.date_exceptions[0].teacher_substitutions[0].substitute_teacher_id == "teacher-math-2"


def test_absence_never_selects_an_unqualified_free_teacher():
    state, event = make_direct_absence_case(qualified_substitute=False)
    seed = build_absence_seed(state, event)
    assert len(seed.unresolved) == 1


def test_busy_prefers_a_two_lesson_class_swap():
    state, event = make_busy_swap_and_substitute_case()
    proposal = build_busy_seed(state, event).to_complete_proposal()
    assert proposal.strategy == "busy_class_swap"
    assert {operation.kind for operation in proposal.operations} == {"swap"}


def test_split_absence_replaces_only_the_affected_group_teacher():
    state, event = make_split_group_absence_case()
    proposal = build_absence_seed(state, event).to_complete_proposal()
    exception = proposal.date_exceptions[0]
    assert exception.cell_overrides == []
    assert exception.teacher_substitutions[0].target_kind == "split_group"
```

- [ ] **Step 2: Run direct-strategy tests and verify failure**

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_change_agent_direct.py -q
```

Expected: collection fails because `change_agent` does not exist.

- [ ] **Step 3: Implement affected occurrence discovery**

For absence, iterate all school dates in the inclusive range, resolve each day, and collect occurrences taught by the missing teacher. For busy, resolve only listed `DateSlot` values and collect occurrences at those exact periods. A split block occurrence must identify its source classes and the specific split group taught by the target teacher.

Return immutable records with `date`, `period`, `class_ids`, `target_kind`, `target_id`, `subject_id`, `teacher_id`, `room_id` and the active version ID.

Define `DirectPlanSeed` with `resolved_operations`, `date_exceptions`, `unresolved` and `strategy_tier`. `to_complete_proposal()` must raise when `unresolved` is non-empty, which prevents a partial direct seed from being exposed to the API.

- [ ] **Step 4: Implement teacher availability and same-subject candidate ordering**

`teacher_is_available()` must reject:

1. the absent/busy teacher where the event blocks them;
2. weekly unavailable slots;
3. an existing normal or split lesson in the resolved day;
4. an overlapping already-applied absence or busy event;
5. teachers whose `qualified_subject_ids` does not include the target subject.

Order remaining candidates by current weekly assigned periods, then case-insensitive teacher name, then ID. This makes proposals deterministic.

- [ ] **Step 5: Implement complete direct absence proposals**

Create one same-slot substitution for every affected occurrence that has a qualified candidate. Put remaining occurrences in `DirectPlanSeed.unresolved`; do not expose that seed as a proposal. For split groups, create only `TeacherSubstitution(target_kind="split_group")`. For ordinary lessons use `target_kind="requirement"`.

- [ ] **Step 6: Implement busy class swaps before busy substitution**

Search other dates Monday through Saturday in the same calendar week and every period in ascending order. A swap is valid only if:

- both cells belong to the same affected class;
- the busy teacher is available at the other slot;
- the other lesson's teacher is available at the blocked slot;
- neither cell is a split block or consecutive-course fragment;
- applying both `CellOverride` values passes the shared validator for that week.

For each busy occurrence independently, attempt a class swap first and then a same-subject substitution. Preserve successful swaps while processing later occurrences. If any occurrence remains unresolved, pass the complete seed to the local optimizer so already-resolved higher-priority operations stay fixed. If every occurrence is resolved, `to_complete_proposal()` returns a proposal that can contain a mixture of swaps and substitutions while still honoring per-occurrence priority.

- [ ] **Step 7: Run direct agent tests**

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_change_agent_direct.py -q
```

Expected: all direct-strategy tests pass.

- [ ] **Step 8: Commit direct strategies**

```powershell
git add backend/change_agent.py backend/tests/test_change_agent_direct.py backend/tests/factories.py
git commit -m "feat: add direct timetable change strategies"
```

---

### Task 8: Add CP-SAT local rescheduling, scoring and long-lived versions

**Files:**
- Create: `backend/local_optimizer.py`
- Modify: `backend/change_agent.py`
- Create: `backend/tests/test_local_optimizer.py`
- Create: `backend/tests/test_change_agent_versions.py`
- Modify: `backend/tests/factories.py`

**Interfaces:**
- Consumes: unresolved affected occurrences plus the fixed higher-priority `DirectPlanSeed` from Task 7 and a structured active version.
- Produces: `LocalRescheduler.solve(state, event, unresolved, seed) -> List[ChangeProposal]`, `proposal_sort_key(proposal)`, `propose_changes(state, event) -> List[ChangeProposal]`.

- [ ] **Step 1: Write failing local-reschedule and no-solution tests**

Add `make_absence_requires_swap_case()` where the only qualified substitute teaches another class in the original Math slot but is free in the affected class's Science slot, while the Science teacher can teach in the original slot. Add `make_absence_without_qualified_teacher()` by removing every other teacher's Math qualification. Add `make_split_block_move_case()` where a replacement geography teacher is available only at a second synchronized slot and every involved class/teacher/room can move there.

Implement test helpers by applying the proposal to a copied state: `all_weekly_counts_unchanged` compares requirement and split-block occurrence counters before/after, and `synchronized_after_apply` asserts all supplied class IDs contain the block at identical slots.

Cover one absence where a qualified substitute is busy in the original Math slot but free in the Science slot:

```python
def test_absence_moves_lesson_to_a_slot_where_same_subject_substitute_is_free():
    state, event = make_absence_requires_swap_case()
    seed = build_absence_seed(state, event)
    proposals = LocalRescheduler().solve(state, event, seed.unresolved, seed)
    best = proposals[0]
    assert best.strategy == "absence_reschedule_for_substitute"
    assert best.score.changed_cells == 2
    assert all_weekly_counts_unchanged(state, best)


def test_optimizer_returns_no_proposal_when_no_qualified_teacher_exists():
    state, event = make_absence_without_qualified_teacher()
    seed = build_absence_seed(state, event)
    assert LocalRescheduler().solve(state, event, seed.unresolved, seed) == []


def test_split_block_moves_as_one_synchronized_unit():
    state, event = make_split_block_move_case()
    seed = build_absence_seed(state, event)
    proposal = LocalRescheduler().solve(state, event, seed.unresolved, seed)[0]
    assert proposal.score.moved_split_blocks == 1
    assert synchronized_after_apply(state, proposal, ["class-1", "class-2"])
```

- [ ] **Step 2: Write failing persistent-version tests**

Add `make_long_absence_case(start, end)` using the same reschedule-required weekly pattern and an absence event with the supplied inclusive range. Add `find_moved_math_cell(version)` and `requirement_for_cell(state, cell)` as direct ID lookup helpers in the test module.

```python
def test_long_reschedule_creates_version_from_next_monday():
    state, event = make_long_absence_case(start=date(2026, 9, 2), end=date(2026, 10, 5))
    proposal = propose_changes(state, event)[0]
    assert proposal.version_candidate.effective_from == date(2026, 9, 7)
    assert proposal.version_candidate.parent_version_id == proposal.base_version_id


def test_restored_teacher_owns_the_moved_base_lesson():
    state, event = make_long_absence_case(start=date(2026, 9, 7), end=date(2026, 10, 12))
    proposal = propose_changes(state, event)[0]
    moved_cell = find_moved_math_cell(proposal.version_candidate)
    requirement = requirement_for_cell(state, moved_cell)
    assert requirement.teacher_id == event.teacher_id
    assert proposal.date_exceptions[0].teacher_substitutions[0].substitute_teacher_id != event.teacher_id
```

- [ ] **Step 3: Run optimizer/version tests and verify failure**

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_local_optimizer.py backend\tests\test_change_agent_versions.py -q
```

Expected: collection fails because `local_optimizer` does not exist.

- [ ] **Step 4: Build the local lesson-token CP-SAT model**

Solve in two bounded neighborhoods. The first contains only directly affected classes and all source classes of an affected split block. If that is infeasible, expand once to classes whose lessons occupy a candidate substitute teacher's useful alternate slots. Never expand beyond this one-hop set.

Create one token per movable normal lesson occurrence and one token per movable split-block occurrence inside the current neighborhood. For token `t` and allowed slot `s`, create `x[t, s]`. Add:

```python
for token in tokens:
    model.Add(sum(x[token.id, slot] for slot in token.allowed_slots) == 1)

for class_id, slot in class_slot_pairs:
    model.Add(
        sum(
            x[token.id, slot]
            for token in tokens_for_class[class_id]
            if slot in token.allowed_slots
        ) <= 1
    )
```

Normal tokens are associated with their requirement, so permuting tokens preserves weekly subject counts. A split token occupies every `source_class_id` and every split-group teacher/room at one shared slot. Consecutive blocks move as a composite token rather than independent periods.

- [ ] **Step 5: Add absence and post-recovery resource views**

For affected absent-course tokens, create substitute choice Booleans only for qualified teachers. Enforce teacher and room occupancy twice for long persistent proposals:

1. absence view uses the selected substitute teacher;
2. post-recovery view uses the original requirement/group teacher.

This rejects a new weekly position that works for the substitute but would conflict when the original teacher returns.

- [ ] **Step 6: Implement lexicographic optimization and up to three alternatives**

Minimize and fix these expressions in sequence: changed cells, affected classes, affected teachers, moved split blocks and slot distance. Use this helper shape:

```python
def solve_lexicographically(model, solver, objectives):
    status = cp_model.UNKNOWN
    for expression in objectives:
        model.Minimize(expression)
        status = solver.Solve(model)
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return status
        model.Add(expression == solver.Value(expression))
    return status
```

After extracting a solution, add a no-good constraint over its selected `x` and substitute variables, then solve again until three proposals are collected or no solution remains. Set a 10-second limit for each alternative and deterministic seed `20260821`.

- [ ] **Step 7: Convert weekly placements into date exceptions or a child version**

For short absence/busy events, emit only actual-date `CellOverride` and `TeacherSubstitution` records. For long absence with moved cells:

- create a child version effective on the event's Monday if it starts Monday, otherwise the following Monday;
- keep original teachers in base requirements/groups;
- add substitute overrides for every affected school date;
- express the partial first week as date exceptions;
- never create an automatic version reverting the schedule after `end_date`.

Direct same-slot substitution must not create a version even when the absence lasts 28 days or more.

- [ ] **Step 8: Enforce strategy tiers in orchestration**

`propose_changes()` must build and preserve per-occurrence strategy choices in this exact form:

```python
if event.kind == ChangeEventKind.BUSY:
    seed = build_busy_seed(state, event)
else:
    seed = build_absence_seed(state, event)

if not seed.unresolved:
    return [seed.to_complete_proposal()]
return LocalRescheduler().solve(state, event, seed.unresolved, seed)
```

The local optimizer must treat seed operations as fixed. Sort alternatives using `proposal_sort_key()` based on the six score fields; never replace an already-feasible higher-priority per-occurrence operation merely to reduce a lower-priority numeric cost.

- [ ] **Step 9: Run all Agent tests and validator regression tests**

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_change_agent_direct.py backend\tests\test_local_optimizer.py backend\tests\test_change_agent_versions.py backend\tests\test_validation_structured.py -q
```

Expected: all selected tests pass.

- [ ] **Step 10: Commit local optimization and long-version logic**

```powershell
git add backend/local_optimizer.py backend/change_agent.py backend/tests/test_local_optimizer.py backend/tests/test_change_agent_versions.py backend/tests/factories.py
git commit -m "feat: optimize local timetable changes with cp-sat"
```

---

### Task 9: Expose proposal, apply, history and dated-calendar APIs

**Files:**
- Modify: `backend/api_models.py`
- Modify: `backend/server.py`
- Create: `backend/tests/test_api_changes.py`

**Interfaces:**
- Consumes: `propose_changes`, shared validator, repository mutations and schedule resolver.
- Produces: `POST /api/change-proposals`, `POST /api/changes/apply`, `GET /api/changes`, `GET /api/calendar/day`.

- [ ] **Step 1: Write failing preview/apply API tests**

Inside `test_api_changes.py`, implement `prepared_change_client(tmp_path)` by saving the catalog and a valid generated version through public APIs. Define `absence_payload()` and `busy_payload()` using the fixed IDs/dates in the backend factories. Define `mutate_catalog_through_api(client)` to change only a non-breaking setting under the current revision, forcing the proposal revision to become stale.

```python
def test_proposal_does_not_mutate_state(tmp_path):
    client = prepared_change_client(tmp_path)
    before = client.get("/api/state").json()["revision"]
    response = client.post("/api/change-proposals", json=absence_payload())
    assert response.status_code == 200
    assert 1 <= len(response.json()["proposals"]) <= 3
    assert client.get("/api/state").json()["revision"] == before


def test_apply_revalidates_and_persists_selected_proposal(tmp_path):
    client = prepared_change_client(tmp_path)
    proposal = client.post("/api/change-proposals", json=busy_payload()).json()["proposals"][0]
    response = client.post("/api/changes/apply", json={"proposal": proposal})
    assert response.status_code == 200
    state = client.get("/api/state").json()
    assert state["revision"] == proposal["base_revision"] + 1
    assert len(state["applied_changes"]) == 1


def test_stale_or_tampered_proposal_is_rejected(tmp_path):
    client = prepared_change_client(tmp_path)
    proposal = client.post("/api/change-proposals", json=absence_payload()).json()["proposals"][0]
    mutate_catalog_through_api(client)
    assert client.post("/api/changes/apply", json={"proposal": proposal}).status_code == 409
```

Also test tampered unqualified substitute returns 422, no-solution response contains conflicts, history returns newest first, and `/api/calendar/day?date=2026-09-08` includes confirmed substitutions.

- [ ] **Step 2: Run change API tests and verify route failure**

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_api_changes.py -q
```

Expected: requests return 404 because change routes do not exist.

- [ ] **Step 3: Add proposal and apply request models**

```python
class ChangeProposalRequest(BaseModel):
    event: ChangeEvent


class ApplyChangeRequest(BaseModel):
    proposal: ChangeProposal
```

The proposal endpoint takes no revision separately because the response embeds the current state revision.

- [ ] **Step 4: Implement proposal and no-solution responses**

`POST /api/change-proposals` loads state, calls `propose_changes`, and returns `{"base_revision": state.revision, "proposals": [proposal.dict() for proposal in proposals]}`. If there is no complete plan, return HTTP 422 with `code = "no_complete_change_plan"`, affected occurrences and blocking constraint messages.

- [ ] **Step 5: Implement transactional apply with full revalidation**

Inside one repository mutation:

1. compare `proposal.base_revision`;
2. verify the base version still exists;
3. recompute affected occurrences from `proposal.event`;
4. apply proposed date exceptions to a deep copy;
5. append `version_candidate` if present and validate it;
6. resolve and validate every affected week in absence and post-recovery views;
7. append the event and one `AppliedChange`;
8. save once.

Do not trust display labels or score values when validating behavior; recalculate them server-side and reject mismatches.

- [ ] **Step 6: Implement history and dated-day routes**

`GET /api/changes` returns applied changes sorted by `applied_at` descending. `GET /api/calendar/day` parses an ISO date and returns the `ResolvedDay`; invalid dates return 422 and dates without an active version return 404.

- [ ] **Step 7: Run all backend tests**

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests -q
```

Expected: all tests pass.

- [ ] **Step 8: Commit Agent APIs**

```powershell
git add backend/api_models.py backend/server.py backend/tests/test_api_changes.py
git commit -m "feat: preview and apply dated timetable changes"
```

---

### Task 10: Remove Clerk and create the local frontend shell

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `frontend/vite.config.js`
- Modify: `frontend/src/main.jsx`
- Rewrite: `frontend/src/App.jsx`
- Rewrite: `frontend/src/pages/components/NavBar.jsx`
- Create: `frontend/src/pages/dashboard/DashboardPage.jsx`
- Create: `frontend/src/pages/recovery/RecoveryPanel.jsx`
- Create: `frontend/src/api/client.js`
- Create: `frontend/src/test/setup.js`
- Create: `frontend/src/App.test.jsx`
- Create: `frontend/src/api/client.test.js`
- Create: `frontend/src/pages/recovery/RecoveryPanel.test.jsx`
- Delete: `frontend/src/utils/fetchWithAuth.js`
- Delete: `frontend/src/pages/auth/LoginPage.jsx`
- Delete: `frontend/src/pages/auth/SignUpPage.jsx`
- Delete: `frontend/src/pages/auth/components/InputField.jsx`
- Delete: `frontend/src/pages/home/HomePage.jsx`
- Delete: `frontend/src/pages/home/components/FeaturesSection.jsx`

**Interfaces:**
- Consumes: backend `/api` routes.
- Produces: `api.getState()`, `api.updateCatalog()`, `api.generateTimetable()`, `api.saveTimetable()`, `api.proposeChange()`, `api.applyChange()` and no-auth application routes.

- [ ] **Step 1: Add frontend test tooling and remove Clerk**

Run from `frontend`:

```powershell
npm uninstall @clerk/clerk-react
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Add scripts:

```json
{
  "test": "vitest",
  "test:run": "vitest run"
}
```

Configure Vitest in `vite.config.js` with `environment: "jsdom"` and setup file `./src/test/setup.js`. The setup file imports `@testing-library/jest-dom/vitest`.

- [ ] **Step 2: Write failing no-login and API-client tests**

`App.test.jsx` must render `App` inside `MemoryRouter initialEntries={["/login"]}` and assert the dashboard heading is displayed, proving old auth paths redirect to root. It must also assert there are no “Sign in”, “Sign up” or “Log out” controls.

`client.test.js` must mock `global.fetch`, call `api.getState()`, and assert the request contains `Content-Type: application/json` but no `Authorization` header.

`RecoveryPanel.test.jsx` must simulate selecting a backup and assert `restoreBackup` is not called until the separate “确认恢复” action is clicked.

- [ ] **Step 3: Run frontend tests and verify failure**

```powershell
npm run test:run
```

Expected: tests fail because Clerk is still imported and `src/api/client.js` is missing.

- [ ] **Step 4: Implement the API client**

Use one request function:

```javascript
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.detail?.message || payload?.detail || "请求失败");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export const api = {
  getState: () => request("/api/state"),
  updateCatalog: (payload) => request("/api/catalog", { method: "PUT", body: JSON.stringify(payload) }),
  updateSettings: (payload) => request("/api/settings", { method: "PUT", body: JSON.stringify(payload) }),
  generateTimetable: (payload) => request("/api/timetables/generate", { method: "POST", body: JSON.stringify(payload) }),
  saveTimetable: (payload) => request("/api/timetables", { method: "POST", body: JSON.stringify(payload) }),
  listTimetables: () => request("/api/timetables"),
  getTimetable: (id) => request(`/api/timetables/${id}`),
  listBackups: () => request("/api/backups"),
  restoreBackup: (name) => request(`/api/backups/${encodeURIComponent(name)}/restore`, { method: "POST", body: JSON.stringify({ confirmed: true }) }),
  proposeChange: (event) => request("/api/change-proposals", { method: "POST", body: JSON.stringify({ event }) }),
  applyChange: (proposal) => request("/api/changes/apply", { method: "POST", body: JSON.stringify({ proposal }) }),
};
```

- [ ] **Step 5: Remove Clerk from entry and replace routes**

`main.jsx` must render only `StrictMode`, `BrowserRouter` and `App`; delete the publishable-key check. Create an initial `DashboardPage` that loads `/api/timetables`, displays “课表管理” and provides an empty-state link to the upcoming catalog flow. If loading returns HTTP 503, render `RecoveryPanel`; it lists backups and requires a second confirmation before calling `restoreBackup`, then reloads state.

At this task boundary, `App.jsx` routes `/` to `DashboardPage` and `/guide` to `GuidePage`; redirect `/login`, `/sign-up`, `/sso-callback`, `/dashboard` and unknown paths to `/`. Tasks 11–13 add feature routes only when their components exist.

Rewrite `NavBar` with local links for 课表管理、基础数据、生成课表、智能调课 and 使用说明. Keep the existing visual language and mobile menu, but remove every Clerk hook and account control.

- [ ] **Step 6: Delete auth/marketing-only files and confirm no Clerk references remain**

Delete the files listed above with patch-based deletion. Run:

```powershell
rg -n "Clerk|clerk|useAuth|useUser|SignedIn|SignedOut|userId|fetchWithAuth" frontend/src frontend/package.json
```

Expected: no output.

- [ ] **Step 7: Run frontend tests and build**

```powershell
npm run test:run
npm run build
```

Expected: tests pass and Vite produces `frontend/dist` without requiring `VITE_CLERK_PUBLISHABLE_KEY`.

- [ ] **Step 8: Commit the local frontend shell**

```powershell
git add frontend
git commit -m "refactor: remove clerk and open directly to dashboard"
```

---

### Task 11: Build catalog, split-block and base-generation UI

**Files:**
- Create: `frontend/src/pages/catalog/CatalogPage.jsx`
- Create: `frontend/src/pages/catalog/SplitCourseBlockEditor.jsx`
- Create: `frontend/src/pages/catalog/catalogState.js`
- Create: `frontend/src/domain/schedule.js`
- Create: `frontend/src/components/ScheduleGrid.jsx`
- Rewrite: `frontend/src/pages/generate/GeneratePage.jsx`
- Delete: `frontend/src/pages/generate/AddTeacher.jsx`
- Create: `frontend/src/pages/catalog/catalogState.test.js`
- Create: `frontend/src/pages/catalog/SplitCourseBlockEditor.test.jsx`
- Create: `frontend/src/pages/generate/GeneratePage.test.jsx`
- Create: `frontend/src/domain/schedule.test.js`

**Interfaces:**
- Consumes: `api.getState`, `api.updateCatalog`, `api.updateSettings`, `api.generateTimetable`, `api.saveTimetable`.
- Produces: validated catalog payloads matching backend snake_case models and saved structured timetable versions.

- [ ] **Step 1: Write failing catalog serialization tests**

Test that `buildCatalogPayload(form, revision)` produces stable IDs and these normalized relations:

```javascript
expect(payload.split_course_blocks[0]).toEqual({
  id: "split-geography-politics",
  name: "地理/政治走班",
  source_class_ids: ["class-1", "class-2"],
  periods_per_week: 1,
  groups: [
    { id: "group-geography", subject_id: "subject-geography", teacher_id: "teacher-zhang", room_id: "room-301" },
    { id: "group-politics", subject_id: "subject-politics", teacher_id: "teacher-wang", room_id: "room-302" },
  ],
});
```

Test that deleting a subject referenced by a requirement or split group returns a local validation error instead of silently deleting it.

Add `schedule.test.js` cases proving a normal `LessonCell` resolves through requirement/subject/teacher indexes and a split cell formats all group subjects, teachers and rooms without parsing display strings.

- [ ] **Step 2: Write failing split-editor and generation-flow tests**

Render `SplitCourseBlockEditor` with two classes and assert the user can choose both source classes, add 地理/政治 groups, choose 张老师/301 and 王老师/302, then receive one normalized block through `onChange`.

Mock API calls in `GeneratePage.test.jsx`; assert “生成预览” calls `generateTimetable`, but `saveTimetable` is called only after “确认保存”.

- [ ] **Step 3: Run focused frontend tests and verify failure**

```powershell
npm run test:run -- src/pages/catalog src/pages/generate/GeneratePage.test.jsx src/domain/schedule.test.js
```

Expected: tests fail because the new catalog files do not exist.

- [ ] **Step 4: Implement catalog normalization and local validation**

`catalogState.js` must export `createId(prefix)`, `buildCatalogPayload(form, revision)`, `validateCatalogForm(form)` and `catalogFromState(state)`. `buildCatalogPayload` derives each teacher's `teaching_assignment_ids` from requirements that reference that teacher. Validation must report duplicate names, missing qualified subjects, requirement totals above weekly capacity, invalid consecutive counts, missing teacher qualification and incomplete split groups before making an API request.

- [ ] **Step 5: Implement the catalog page in focused sections**

Build sections for system periods, classes, subjects, rooms, teachers, normal course requirements and split blocks. Teacher rows must support qualified subjects, fixed unavailable weekday/period slots, homeroom class and main subject. Normal requirements must select class, subject, assigned teacher, periods per week, optional room and consecutive-period count.

The save action sends one `PUT /api/catalog` request using the current revision, replaces local state with the returned state and displays backend validation errors next to the relevant section.

- [ ] **Step 6: Implement the split-course editor**

Require at least two source classes and two groups. Prevent duplicate source classes, group subjects, group teachers and group rooms. Display a summary such as “1班 + 2班：地理（张老师 / 301）｜政治（王老师 / 302）”.

- [ ] **Step 7: Rewrite generation as preview then confirmation**

Implement `schedule.js` with `buildScheduleIndexes(state)` and `formatCell(cell, indexes)`. Implement `ScheduleGrid` using those helpers, with empty cells shown as “空课” and split cells showing every subject/teacher/room group.

`GeneratePage` loads state, blocks generation when catalog validation fails, asks for timetable name and effective date (default today), and renders the returned candidate through `ScheduleGrid`. “确认保存” sends `{base_revision, version}` and navigates to `/timetables/{version.id}` only after success. Add `/catalog` and `/generate` routes to `App.jsx` in the same step.

- [ ] **Step 8: Delete the old combined teacher/generation page**

Delete `AddTeacher.jsx` after its required teacher, diagnostics and save behaviors are represented in CatalogPage and GeneratePage. Confirm no route or import references it:

```powershell
rg -n "AddTeacher|add-teachers" frontend/src
```

Expected: no output.

- [ ] **Step 9: Run focused tests, lint and build**

```powershell
npm run test:run -- src/pages/catalog src/pages/generate/GeneratePage.test.jsx src/domain/schedule.test.js
npm run lint
npm run build
```

Expected: all commands succeed.

- [ ] **Step 10: Commit catalog and generation UI**

```powershell
git add frontend/src/pages/catalog frontend/src/pages/generate/GeneratePage.jsx frontend/src/domain frontend/src/components/ScheduleGrid.jsx frontend/src/App.jsx frontend/package.json frontend/package-lock.json
git add -u frontend/src/pages/generate/AddTeacher.jsx
git commit -m "feat: configure catalog and generate structured timetables"
```

---

### Task 12: Migrate dashboard, display and edit flows to immutable structured versions

**Files:**
- Modify: `frontend/src/domain/schedule.js`
- Modify: `frontend/src/components/ScheduleGrid.jsx`
- Modify: `frontend/src/pages/dashboard/DashboardPage.jsx`
- Create: `frontend/src/pages/timetable/TimetablePage.jsx`
- Create: `frontend/src/pages/timetable/EditTimetablePage.jsx`
- Modify: `frontend/src/api/client.js`
- Delete: `frontend/src/pages/dashboard/DashbordPage.jsx`
- Delete: `frontend/src/pages/generate/TimetableDisplay.jsx`
- Delete: `frontend/src/pages/generate/components/EditTimetable.jsx`
- Modify: `frontend/src/domain/schedule.test.js`
- Create: `frontend/src/pages/timetable/EditTimetablePage.test.jsx`

**Interfaces:**
- Consumes: structured version, catalog state and date calendar endpoint.
- Produces: shared display cells, date preview, immutable child-version save flow.

- [ ] **Step 1: Write failing structured-display tests**

At the top of `schedule.test.js`, define `indexes` with fixed maps for class-1、subject-math、teacher-li、two split groups and rooms 301/302. Define `lessonCell = {kind: "lesson", requirement_id: "req-math"}` and `splitCell = {kind: "split", split_block_id: "split-geography-politics"}`.

`schedule.test.js` must assert:

```javascript
expect(formatCell(lessonCell, indexes)).toEqual({
  title: "数学",
  subtitle: "李老师 · 1班",
  room: "",
  kind: "lesson",
});

expect(formatCell(splitCell, indexes)).toEqual({
  title: "地理 / 政治",
  subtitle: "张老师 / 王老师",
  room: "301 / 302",
  kind: "split",
});
```

Also test `applyCellMove()` rejects moving only one class reference of a synchronized split block.

- [ ] **Step 2: Write failing immutable-edit test**

Render `EditTimetablePage` with mocked API. Move a normal lesson, click save, choose effective date and assert it calls `createChildVersion(id, {base_revision, name, effective_from, class_schedules})`; assert it never calls an in-place update endpoint.

- [ ] **Step 3: Run focused tests and verify failure**

```powershell
npm run test:run -- src/domain/schedule.test.js src/pages/timetable/EditTimetablePage.test.jsx
```

Expected: imports fail because the new files do not exist.

- [ ] **Step 4: Implement schedule formatting and grid rendering**

Build lookup maps by ID once. `ScheduleGrid` receives `classSchedules`, catalog indexes, optional resolved substitutions and an `editable` flag. A split cell must display all group subjects, teachers and rooms, and must occupy the same visual slot for every source class. Empty cells display “空课”.

- [ ] **Step 5: Implement the local dashboard**

Fetch `/api/timetables` on mount without authentication. Group versions by root ancestor, show the latest active version, and let the user select older versions. Provide actions for view, create child edit, intelligent change and safe delete. Remove welcome-name and signed-in loading branches.

- [ ] **Step 6: Implement version/date timetable viewing**

`TimetablePage` loads by route ID rather than relying on navigation state. It supports “班级周课表”“教师周课表”和“按日期查看”; the teacher tab reads the version's rebuilt `teacher_schedules`, and the date view calls `/api/calendar/day`. Keep existing PDF/Excel export only after adapting export cells to `formatCell()` output.

Extend `api/client.js` with `getDay(date)`, `createChildVersion(id, payload)` and `deleteTimetable(id)`. Add `/timetables/:id` and `/timetables/:id/edit` routes only after both page components exist.

- [ ] **Step 7: Implement immutable editing**

Allow normal lesson moves/swaps only when local structured checks pass. Move a split block across all source classes as one action. On save, require a version name and effective date, call `POST /api/timetables/{id}/versions`, and surface backend 422 errors without discarding edits.

- [ ] **Step 8: Remove legacy string-based timetable pages**

Delete the three legacy files listed above and update App imports. Run:

```powershell
rg -n 'class_timetable|teacher_timetable|DashbordPage|\.split\("\("' frontend/src
```

Expected: no legacy parser or misspelled dashboard component remains.

- [ ] **Step 9: Run timetable UI tests, lint and build**

```powershell
npm run test:run -- src/domain/schedule.test.js src/pages/timetable/EditTimetablePage.test.jsx
npm run lint
npm run build
```

Expected: all commands succeed.

- [ ] **Step 10: Commit structured version UI**

```powershell
git add frontend/src/api frontend/src/domain frontend/src/components/ScheduleGrid.jsx frontend/src/pages/dashboard frontend/src/pages/timetable frontend/src/App.jsx
git add -u frontend/src/pages/generate/TimetableDisplay.jsx frontend/src/pages/generate/components/EditTimetable.jsx
git commit -m "refactor: manage immutable structured timetable versions"
```

---

### Task 13: Add the Agent event form, proposal preview and confirmation flow

**Files:**
- Create: `frontend/src/pages/agent/ChangeAgentPage.jsx`
- Create: `frontend/src/pages/agent/ProposalCard.jsx`
- Create: `frontend/src/pages/agent/changeForm.js`
- Modify: `frontend/src/api/client.js`
- Create: `frontend/src/pages/agent/changeForm.test.js`
- Create: `frontend/src/pages/agent/ChangeAgentPage.test.jsx`

**Interfaces:**
- Consumes: `api.proposeChange`, `api.applyChange`, catalog teachers, versions and backend proposal models.
- Produces: date-valid absence/busy events, one-to-three proposal previews and explicit confirmation.

- [ ] **Step 1: Write failing event serialization tests**

Test absence output:

```javascript
expect(buildEvent({
  kind: "absence",
  teacherId: "teacher-1",
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  reason: "病假",
})).toMatchObject({
  kind: "absence",
  teacher_id: "teacher-1",
  start_date: "2026-09-01",
  end_date: "2026-09-30",
  busy_slots: [],
});
```

Test busy output contains only explicit `{date, period}` slots and rejects Sunday, duplicate slots and an end date earlier than start date.

- [ ] **Step 2: Write failing preview-before-apply interaction tests**

Mock `proposeChange` to return two proposals. Assert both cards show strategy, reason, score, affected classes and before/after operations. Click a proposal's “选择方案” and assert `applyChange` is still not called. Only after clicking the confirmation dialog's “确认应用” may `applyChange` run.

Also test a 422 no-solution response renders blocking reasons and no confirmation button.

- [ ] **Step 3: Run Agent UI tests and verify failure**

```powershell
npm run test:run -- src/pages/agent
```

Expected: tests fail because the Agent UI files do not exist.

- [ ] **Step 4: Implement the change-event form**

Load teachers from `/api/state`. For absence, show start/end dates and explain that the teacher is treated as unavailable all day. For busy, allow adding rows with real date and 1-based displayed period, converting to 0-based API period. Do not show a “long absence” checkbox; the backend derives it from the configured 28-day threshold.

- [ ] **Step 5: Implement proposal cards with explicit priorities**

Each `ProposalCard` must show a Chinese strategy label, explanation, six score fields, warnings, new-version effective date when present, and an operation table with date、课节、班级、原安排、新安排. Visually mark direct swap, substitute and split-block movement with distinct badges, reusing existing project colors.

- [ ] **Step 6: Implement selection and confirmation without optimistic mutation**

Keep proposals only in React state. Selecting a proposal opens a summary dialog. Call `api.applyChange(selectedProposal)` only after the second confirmation action. On success, replace the cached revision with the returned state, clear draft proposals and navigate to the affected timetable/date view. On HTTP 409, show “数据已变化，请重新生成方案” and clear stale proposals.

Add `/agent` to `App.jsx` only after `ChangeAgentPage` exists.

- [ ] **Step 7: Run Agent UI tests, lint and build**

```powershell
npm run test:run -- src/pages/agent
npm run lint
npm run build
```

Expected: all commands succeed.

- [ ] **Step 8: Commit the Agent UI**

```powershell
git add frontend/src/pages/agent frontend/src/api/client.js frontend/src/App.jsx
git commit -m "feat: preview and confirm intelligent timetable changes"
```

---

### Task 14: Remove legacy backend code, add one-click local startup and verify end to end

**Files:**
- Delete: `backend/models.py`
- Delete: `backend/generator.py`
- Delete: `backend/test_solver.py`
- Delete: `backend/test_validation.py`
- Modify: `backend/README.md`
- Modify: `frontend/README.md`
- Modify: `README.md`
- Modify: `frontend/src/pages/home/GuidePage.jsx`
- Modify: `backend/server.py`
- Create: `start-local.ps1`
- Create: `start-local.bat`
- Create: `backend/tests/test_smoke.py`

**Interfaces:**
- Consumes: completed backend and frontend.
- Produces: one-click local startup, static frontend serving and verified user workflow.

- [ ] **Step 1: Write a failing end-to-end backend smoke test**

The smoke test must use a temporary JSON path and TestClient to execute:

1. save a complete catalog with 1班/2班 and the geography/politics split block;
2. generate and save a base timetable;
3. create a busy event with both a swap and substitute available;
4. assert the returned first strategy is `busy_class_swap`;
5. apply it and resolve the affected real date;
6. create an absence event and assert every replacement teacher is qualified;
7. restart `create_app()` on the same JSON path and assert all confirmed data still loads.

- [ ] **Step 2: Run the smoke test and verify any remaining integration failure**

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_smoke.py -q
```

Expected before cleanup: the test identifies any final boundary mismatch; keep it red until the complete public workflow succeeds.

- [ ] **Step 3: Serve the built frontend from FastAPI for local use**

After all `/api` routes are registered, mount `frontend/dist` when it exists:

```python
from fastapi.staticfiles import StaticFiles

frontend_dist = Path(__file__).resolve().parents[1] / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
```

API routes must be registered before this mount. Development without `dist` continues to use Vite on port 5173.

- [ ] **Step 4: Add one-click Windows startup scripts**

Create `start-local.ps1`:

```powershell
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonPath = Join-Path $projectRoot 'backend\venv\Scripts\python.exe'
$frontendPath = Join-Path $projectRoot 'frontend'

if (-not (Test-Path -LiteralPath $pythonPath)) {
    throw '缺少 backend\venv，请先按 README 完成一次依赖安装。'
}
if (-not (Test-Path -LiteralPath (Join-Path $frontendPath 'node_modules'))) {
    throw '缺少 frontend\node_modules，请先在 frontend 目录运行 npm install。'
}

Push-Location $frontendPath
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw '前端构建失败。' }
} finally {
    Pop-Location
}

$browserJob = Start-Job -ScriptBlock {
    param($url)
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        try {
            Invoke-WebRequest -Uri "$url/api/state" -UseBasicParsing -TimeoutSec 1 | Out-Null
            Start-Process $url
            return
        } catch {
            Start-Sleep -Milliseconds 250
        }
    }
} -ArgumentList 'http://127.0.0.1:8001'

try {
    & $pythonPath -m uvicorn server:app --app-dir (Join-Path $projectRoot 'backend') --host 127.0.0.1 --port 8001
} finally {
    Stop-Job $browserJob -ErrorAction SilentlyContinue
    Remove-Job $browserJob -Force -ErrorAction SilentlyContinue
}
```

Create `start-local.bat`:

```bat
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-local.ps1"
pause
```

- [ ] **Step 5: Remove legacy string/Mongo/auth code and stale environment requirements**

Delete the four backend legacy files listed above after all tests have moved under `backend/tests`. Remove obsolete MongoDB and Clerk setup from READMEs and GuidePage. Delete `VITE_CLERK_PUBLISHABLE_KEY` references; keep only optional `VITE_API_BASE_URL` for Vite development. Update the ignored local `backend/.env` to remove `MONGO_URI`, and update `frontend/.env.development` to remove the Clerk key if those files exist.

Run repository-wide scans:

```powershell
rg -n "Clerk|clerk|MongoDB|pymongo|MONGO_URI|userId|ObjectId|Subject\(Teacher\)|fetchWithAuth" -g '!frontend/node_modules/**' -g '!backend/venv/**' -g '!docs/superpowers/**'
```

Expected: no application/runtime references. Historical mentions inside the approved spec and plan are allowed.

- [ ] **Step 6: Update user documentation**

Root README must include first-time installation, double-click `start-local.bat`, data/backup paths, how to configure the split-course example, Agent priority rules, confirmation behavior and backup restore steps. Backend README must document the `/api` routes and JSON schema version. Frontend README must document Vite development and the no-auth route map.

- [ ] **Step 7: Run the complete verification suite**

Run from repository root:

```powershell
$env:PYTHONUTF8='1'
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests -q
Push-Location frontend
try {
    npm run test:run
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    npm run lint
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    npm run build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Pop-Location
}
```

Expected: all backend tests pass, all frontend tests pass, ESLint exits 0 and Vite build succeeds.

- [ ] **Step 8: Perform a local HTTP smoke check**

Start Uvicorn on port 8001, request `/api/state` and `/`, and confirm both return HTTP 200. Stop the server after the check. Confirm `backend/data/timetable-data.json` is created only by the application and that no MongoDB or Clerk configuration is requested.

- [ ] **Step 9: Commit cleanup, launcher and documentation**

```powershell
git add README.md backend frontend start-local.ps1 start-local.bat
git add -u backend/models.py backend/generator.py backend/test_solver.py backend/test_validation.py
git commit -m "docs: finish local timetable agent workflow"
```

---

## Final Review Checklist

- [ ] Every spec requirement maps to at least one task and automated test.
- [ ] No route, component or package requires Clerk, MongoDB or `userId`.
- [ ] No persisted schedule cell relies on parsing a display string.
- [ ] Busy prioritizes a valid class swap; absence prioritizes a valid same-slot same-subject substitute.
- [ ] All candidate plans keep weekly subject counts and reject unqualified substitutes.
- [ ] Split blocks remain synchronized across classes, teachers and rooms.
- [ ] Long moved schedules persist after recovery; temporary substitutions do not become permanent teacher assignments.
- [ ] Preview operations do not mutate JSON, while confirmed operations are revision-checked, revalidated, backed up and atomically saved.
- [ ] The application starts without external services or keys and opens directly to the dashboard.
