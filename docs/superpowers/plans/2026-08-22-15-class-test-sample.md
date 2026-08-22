# 15-Class Timetable Test Sample Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic 15-class school dataset, generate its timetable through the production solver, safely install it into the local JSON repository, and expose fixed lessons and self-study periods correctly in the UI.

**Architecture:** Extend `CourseRequirement` with backward-compatible fixed weekly slots, enforce them in catalog validation, CP-SAT generation, and generated-version validation, and apply the existing daily limit to split blocks. Keep demo construction in a focused backend module with a pure builder plus a CLI wrapper; the frontend preserves and edits fixed slots while rendering persisted `null` cells as “自习”.

**Tech Stack:** Python 3, Pydantic 1.x, OR-Tools CP-SAT, pytest, React 19, Vitest, Testing Library, Vite.

**Spec:** `docs/superpowers/specs/2026-08-22-15-class-test-sample-design.md`

## Global Constraints

- Work on the existing `feat/local-timetable-agent` branch and preserve all unrelated dirty/staged user changes.
- Persist data only as schema version 1 JSON; `fixed_slots` must default to an empty list for old files.
- The school week is Monday–Saturday with eight periods per day; periods 1–5 are morning and 6–8 are afternoon.
- The demo uses exactly 15 classes, 17 rooms, and three PE teachers with five classes each. Ordinary teachers are grouped by adjacent classes only to keep the sample deterministic and readable; this is not a product restriction, and operators may assign any number of classes to one teacher.
- Academic requirements have six periods per week and at most one occurrence per day; PE has two periods per week; homeroom class meeting is fixed at Monday period 8.
- Classes 14 and 15 share one six-period geography/politics split block using rooms 301 and 302.
- Empty class cells remain `null` in JSON and display as “自习”.
- Random teacher unavailability is deterministic with seed `20260822` and never blocks a teacher's fixed class meeting.
- The installed timetable version is effective from `2026-09-01`.
- Do not add authentication, cloud storage, multi-device synchronization, or a sample-data button.

---

### Task 1: Fixed-slot domain and catalog validation

**Files:**
- Modify: `backend/domain.py`
- Modify: `backend/validation.py`
- Modify: `backend/tests/test_domain.py`
- Modify: `backend/tests/test_validation_structured.py`

**Interfaces:**
- Produces: `CourseRequirement.fixed_slots: List[Slot]`.
- Produces: catalog error codes `duplicate_fixed_slot`, `fixed_slot_count`, `fixed_slot_consecutive`, `fixed_slot_unavailable`, and `fixed_slot_conflict`.
- Consumes: existing `Settings.periods_per_day`, `Teacher.weekly_unavailable_slots`, and requirement class/teacher/room references.

- [ ] **Step 1: Write failing domain round-trip tests**

```python
def test_course_requirement_fixed_slots_default_and_round_trip():
    requirement = CourseRequirement(
        id="req-meeting",
        class_id="class-1",
        subject_id="subject-meeting",
        teacher_id="teacher-1",
        periods_per_week=1,
    )
    assert requirement.fixed_slots == []

    restored = CourseRequirement.parse_raw(
        requirement.copy(update={"fixed_slots": [Slot(weekday=0, period=7)]})
        .json(by_alias=True)
    )
    assert restored.fixed_slots == [Slot(weekday=0, period=7)]
```

- [ ] **Step 2: Run the domain test and verify it fails**

Run: `& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_domain.py -q`

Expected: FAIL because `CourseRequirement` has no `fixed_slots` field.

- [ ] **Step 3: Add the backward-compatible field**

```python
class CourseRequirement(DomainModel):
    id: str = Field(default_factory=new_id)
    class_id: str
    subject_id: str
    teacher_id: str
    periods_per_week: int = Field(ge=1)
    room_id: Optional[str] = None
    consecutive_periods: int = Field(default=1, ge=1)
    fixed_slots: List[Slot] = Field(default_factory=list)
```

- [ ] **Step 4: Write failing catalog validation tests**

Add focused tests that mutate `minimal_state()` with the following cases and assert the exact code:

```python
@pytest.mark.parametrize(
    ("fixed_slots", "periods_per_week", "consecutive", "code"),
    [
        ([Slot(weekday=0, period=0), Slot(weekday=0, period=0)], 2, 1, "duplicate_fixed_slot"),
        ([Slot(weekday=0, period=0), Slot(weekday=1, period=0)], 1, 1, "fixed_slot_count"),
        ([Slot(weekday=0, period=0)], 2, 2, "fixed_slot_consecutive"),
    ],
)
def test_catalog_rejects_invalid_fixed_slots(
    fixed_slots, periods_per_week, consecutive, code
):
    state, _ = make_two_class_state()
    requirement = state.course_requirements[0]
    requirement.fixed_slots = fixed_slots
    requirement.periods_per_week = periods_per_week
    requirement.consecutive_periods = consecutive
    assert code in error_codes(validate_catalog(state))
```

Also cover: period outside configured day; a fixed slot in the assigned teacher's unavailable set; and two requirements that share the same fixed class, teacher, or non-null room resource.

- [ ] **Step 5: Run validation tests and verify they fail**

Run: `& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_validation_structured.py -q`

Expected: FAIL because the fixed-slot rules are not implemented.

- [ ] **Step 6: Implement fixed-slot validation**

In `validate_catalog`, validate each requirement's unique `(weekday, period)` pairs, configured period bounds, count, consecutive compatibility, and teacher availability. Build maps keyed by `(resource_id, weekday, period)` for class, teacher, and non-null room and emit `fixed_slot_conflict` for keys claimed by more than one requirement.

```python
fixed_claims: Dict[
    Tuple[str, str, int, int], List[str]
] = defaultdict(list)

for requirement in state.course_requirements:
    slots = [(slot.weekday, slot.period) for slot in requirement.fixed_slots]
    if len(slots) != len(set(slots)):
        _error(report, "duplicate_fixed_slot", "Requirement repeats a fixed slot", [requirement.id])
    if len(slots) > requirement.periods_per_week:
        _error(report, "fixed_slot_count", "Requirement has more fixed slots than weekly periods", [requirement.id])
    if slots and requirement.consecutive_periods != 1:
        _error(report, "fixed_slot_consecutive", "Fixed slots require single-period lessons", [requirement.id])
```

- [ ] **Step 7: Run focused backend tests**

Run: `& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_domain.py backend\tests\test_validation_structured.py -q`

Expected: PASS.

- [ ] **Step 8: Commit only Task 1 paths**

```powershell
git add backend/domain.py backend/validation.py backend/tests/test_domain.py backend/tests/test_validation_structured.py
git commit -m "feat: validate fixed timetable slots" -- backend/domain.py backend/validation.py backend/tests/test_domain.py backend/tests/test_validation_structured.py
```

---

### Task 2: Solver and generated-version enforcement

**Files:**
- Modify: `backend/base_solver.py`
- Modify: `backend/validation.py`
- Modify: `backend/tests/test_base_solver.py`
- Modify: `backend/tests/test_validation_structured.py`

**Interfaces:**
- Consumes: `CourseRequirement.fixed_slots` from Task 1.
- Produces: `_add_fixed_slot_constraints(model, state, normal) -> None`.
- Produces: `_add_split_daily_constraints(model, state, split) -> None`.
- Produces: generated-version errors `missing_fixed_slot` and `split_daily_subject_limit`.

- [ ] **Step 1: Write failing solver tests for fixed lessons and split daily limits**

```python
def test_solver_places_required_fixed_slot():
    state = minimal_state()
    requirement = state.course_requirements[0]
    requirement.fixed_slots = [Slot(weekday=0, period=3)]
    version = generate_base_timetable(state, "Fixed", date(2026, 9, 1))
    assert version.class_schedules[requirement.class_id][0][3].requirement_id == requirement.id


def test_solver_limits_split_block_to_one_period_per_day():
    state = split_state(periods_per_week=6)
    state.settings.max_daily_subject_periods = 1
    version = generate_base_timetable(state, "Split", date(2026, 9, 1))
    block_id = state.split_course_blocks[0].id
    for day in version.class_schedules[state.classes[0].id]:
        assert sum(cell is not None and cell.split_block_id == block_id for cell in day) <= 1
```

- [ ] **Step 2: Run solver tests and verify they fail**

Run: `& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_base_solver.py -q`

Expected: fixed placement is not guaranteed and/or split blocks can repeat within one day.

- [ ] **Step 3: Add CP-SAT hard constraints**

Call both helpers after weekly count constraints and before resource conflicts:

```python
def _add_fixed_slot_constraints(model, state, normal):
    for requirement in state.course_requirements:
        for slot in requirement.fixed_slots:
            model.Add(normal[(requirement.id, slot.weekday, slot.period)] == 1)


def _add_split_daily_constraints(model, state, split):
    for block in state.split_course_blocks:
        for day in range(state.settings.working_days):
            model.Add(
                sum(
                    split[(block.id, day, period)]
                    for period in range(state.settings.periods_per_day)
                ) <= state.settings.max_daily_subject_periods
            )
```

- [ ] **Step 4: Write failing generated-version validation tests**

Add one version that omits a declared fixed requirement cell and one version that places the same split block twice for a class on a day with limit one. Assert `missing_fixed_slot` and `split_daily_subject_limit`.

- [ ] **Step 5: Run validation tests and verify they fail**

Run: `& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_validation_structured.py -q`

Expected: FAIL because generated-version validation does not check those rules.

- [ ] **Step 6: Extend version validation**

Track actual `(requirement_id, weekday, period)` cells and split-block daily counts while walking class schedules. After the walk, emit `missing_fixed_slot` for every absent declared fixed slot and `split_daily_subject_limit` when a source class contains the same split block more often than `max_daily_subject_periods` on a day.

- [ ] **Step 7: Run focused solver and validation tests**

Run: `& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_base_solver.py backend\tests\test_validation_structured.py -q`

Expected: PASS.

- [ ] **Step 8: Commit only Task 2 paths**

```powershell
git add backend/base_solver.py backend/validation.py backend/tests/test_base_solver.py backend/tests/test_validation_structured.py
git commit -m "feat: enforce fixed and split timetable limits" -- backend/base_solver.py backend/validation.py backend/tests/test_base_solver.py backend/tests/test_validation_structured.py
```

---

### Task 3: Deterministic 15-class sample builder and CLI

**Files:**
- Create: `backend/sample_15_classes.py`
- Create: `backend/tests/test_sample_15_classes.py`
- Create: `backend/samples/15-class-demo.json`
- Modify: `backend/README.md`

**Interfaces:**
- Produces: `build_15_class_demo_state() -> AppState`, returning a catalog plus one validated timetable version.
- Produces: `write_sample(state: AppState, output_path: Path) -> None` for a standalone tracked fixture.
- Produces: `install_sample(state: AppState, repository: JsonRepository) -> AppState`, using `JsonRepository.save` and its backup/revision behavior.
- Produces CLI: `python backend/sample_15_classes.py [--output PATH] [--install [PATH]]`.

- [ ] **Step 1: Write failing structural and allocation tests**

```python
def test_demo_catalog_shape_and_combinations():
    state = build_15_class_demo_state()
    assert len(state.classes) == 15
    assert len(state.rooms) == 17
    assert len(state.split_course_blocks) == 1
    assert state.split_course_blocks[0].source_class_ids == ["class-14", "class-15"]


def test_demo_teacher_loads():
    state = build_15_class_demo_state()
    pe_subject_id = "subject-pe"
    pe_requirements = [r for r in state.course_requirements if r.subject_id == pe_subject_id]
    loads = Counter(r.teacher_id for r in pe_requirements)
    assert sorted(loads.values()) == [5, 5, 5]
```

The sample groups ordinary teachers by adjacent classes for stable, readable allocation. Do not assert a class-count cap: operators may assign any number of classes to one teacher.

Add exact assertions for the class combination counts, 15 unique homeroom teachers, 17 room names, exactly one fixed Monday period-8 meeting per class, and deterministic non-empty unavailability that avoids fixed meeting slots.

- [ ] **Step 2: Run sample tests and verify import failure**

Run: `& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_sample_15_classes.py -q`

Expected: FAIL because `sample_15_classes` does not exist.

- [ ] **Step 3: Implement deterministic catalog construction**

Use stable string IDs (`class-01`, `subject-chinese`, `teacher-chinese-01`, `room-class-01`) rather than UUIDs. Create subjects for 语文、数学、英语、物理、化学、生物、历史、地理、政治、体育、班会. Allocate ordinary subject teachers in consecutive class pairs and special split teachers to classes 14–15. Build one requirement per normal class/subject, a separate class-meeting requirement, and one split block.

```python
DEMO_SEED = 20260822
EFFECTIVE_FROM = date(2026, 9, 1)
CLASS_COMBINATIONS = {
    **{index: ("physics", "chemistry", "biology") for index in range(1, 5)},
    **{index: ("physics", "chemistry", "geography") for index in range(5, 7)},
    **{index: ("physics", "chemistry", "politics") for index in range(7, 9)},
    9: ("physics", "politics", "geography"),
    10: ("physics", "biology", "politics"),
    11: ("history", "politics", "geography"),
    12: ("history", "politics", "geography"),
    13: ("history", "geography", "biology"),
}
```

- [ ] **Step 4: Assign deterministic teacher unavailability and generate the real timetable**

Choose approximately one third of teachers from a local `random.Random(DEMO_SEED)`. Give each selected teacher 1–3 unique slots, skipping Monday period 8 for homeroom teachers. Validate the finished catalog and call `generate_base_timetable(state, "15班测试课表", EFFECTIVE_FROM)` exactly once; do not remove required constraints on failure, and surface `GenerationError` diagnostics.

- [ ] **Step 5: Write failing schedule-invariant tests**

For every class and day, assert exactly one occurrence of 语文、数学、英语 and that class's three academic electives (or one split occurrence replacing geography/politics for classes 14–15). Assert two PE lessons weekly, Monday period 8 class meeting taught by the matching homeroom teacher, nine `None` cells weekly, synchronized split cells, correct split teachers/rooms, no conflicts, and `assert_valid_version` success.

- [ ] **Step 6: Run invariant tests and adjust only deterministic allocation constraints**

Run: `& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_sample_15_classes.py -q -v`

Expected: PASS with one production-solver-generated timetable.

- [ ] **Step 7: Test fixture writing and repository installation**

Use `tmp_path` to assert UTF-8 JSON round-trip. Pre-populate a temporary repository, install the sample, and assert revision increments by one and a backup exists.

```python
saved = install_sample(build_15_class_demo_state(), repository)
assert saved.revision == previous.revision + 1
assert repository.list_backups()
assert repository.load() == saved
```

- [ ] **Step 8: Implement CLI and document exact commands**

Default command writes `backend/samples/15-class-demo.json`; `--install` writes through `JsonRepository` to the default data path; `--install PATH` uses the given test/local path. Document that the server must be stopped for installing current data.

- [ ] **Step 9: Generate and verify the tracked fixture**

Run: `& 'backend\venv\Scripts\python.exe' backend\sample_15_classes.py`

Run: `& 'backend\venv\Scripts\python.exe' -c "from pathlib import Path; from domain import AppState; p=Path('backend/samples/15-class-demo.json'); s=AppState.parse_raw(p.read_text(encoding='utf-8')); print(len(s.classes), len(s.rooms), len(s.timetable_versions))"`

Expected: `15 17 1`.

- [ ] **Step 10: Commit only Task 3 paths**

```powershell
git add backend/sample_15_classes.py backend/tests/test_sample_15_classes.py backend/samples/15-class-demo.json backend/README.md
git commit -m "feat: add deterministic 15-class demo" -- backend/sample_15_classes.py backend/tests/test_sample_15_classes.py backend/samples/15-class-demo.json backend/README.md
```

---

### Task 4: Frontend fixed-slot editing and self-study display

**Files:**
- Modify: `frontend/src/pages/catalog/catalogState.js`
- Modify: `frontend/src/pages/catalog/catalogState.test.js`
- Modify: `frontend/src/pages/catalog/CatalogPage.jsx`
- Modify: `frontend/src/pages/catalog/CatalogPage.test.jsx`
- Modify: `frontend/src/components/ScheduleGrid.jsx`
- Modify: `frontend/src/pages/timetable/TimetablePage.test.jsx`

**Interfaces:**
- Consumes: course requirement `fixed_slots: Array<{weekday: number, period: number}>`.
- Produces: cloned and serialized `fixed_slots` without mutation or loss.
- Produces: basic client errors for duplicate/out-of-range slots, count overflow, and `consecutive_periods !== 1`.
- Produces: class schedule empty-cell label “自习”.

- [ ] **Step 1: Write failing catalog-state preservation and validation tests**

```javascript
it("preserves fixed slots in form and payload", () => {
  const source = stateWithRequirement({ fixed_slots: [{ weekday: 0, period: 7 }] });
  const form = createCatalogForm(source);
  expect(form.course_requirements[0].fixed_slots).toEqual([{ weekday: 0, period: 7 }]);
  expect(form.course_requirements[0].fixed_slots).not.toBe(source.course_requirements[0].fixed_slots);
  expect(buildCatalogPayload(form, 3).course_requirements[0].fixed_slots)
    .toEqual([{ weekday: 0, period: 7 }]);
});
```

Add validation cases for duplicate slots, `weekday >= working_days`, `period >= periods_per_day`, more slots than `periods_per_week`, and fixed slots with a consecutive value other than one.

- [ ] **Step 2: Run the state tests and verify they fail**

Run: `npm test -- --run src/pages/catalog/catalogState.test.js`

Workdir: `frontend`

Expected: fixed slots are dropped and errors are absent.

- [ ] **Step 3: Preserve and validate fixed slots in catalog state**

Clone the array in `createCatalogForm`, include normalized integer values in `buildCatalogPayload`, and add concrete Chinese validation messages keyed by requirement index.

- [ ] **Step 4: Write failing editor interaction tests**

Render `CatalogPage` with a requirement, click “添加固定课位”, choose 周一 and 第8节, and save. Assert the API payload contains `fixed_slots: [{weekday: 0, period: 7}]`; then remove it and assert an empty array.

- [ ] **Step 5: Run the page tests and verify they fail**

Run: `npm test -- --run src/pages/catalog/CatalogPage.test.jsx`

Workdir: `frontend`

Expected: FAIL because the controls do not exist.

- [ ] **Step 6: Add compact fixed-slot controls to each requirement card**

Under the consecutive-period field, render existing slots as weekday/period select pairs with a remove button and one “添加固定课位” button. New slots default to the first unused valid slot. Reuse immutable requirement updates already present in `CatalogPage.jsx`.

- [ ] **Step 7: Write a failing self-study rendering test**

```javascript
it("renders null class cells as self-study", async () => {
  render(<TimetablePage />);
  expect(await screen.findAllByText("自习")).not.toHaveLength(0);
  expect(screen.queryByText("空课")).not.toBeInTheDocument();
});
```

- [ ] **Step 8: Change only class-grid empty cells to “自习”**

Replace the empty label in `ScheduleGrid.jsx`; keep teacher schedule cells labeled “空课” because they describe teacher availability, not student self-study.

- [ ] **Step 9: Run focused frontend tests**

Run: `npm test -- --run src/pages/catalog/catalogState.test.js src/pages/catalog/CatalogPage.test.jsx src/pages/timetable/TimetablePage.test.jsx`

Workdir: `frontend`

Expected: PASS.

- [ ] **Step 10: Commit only Task 4 paths**

```powershell
git add frontend/src/pages/catalog/catalogState.js frontend/src/pages/catalog/catalogState.test.js frontend/src/pages/catalog/CatalogPage.jsx frontend/src/pages/catalog/CatalogPage.test.jsx frontend/src/components/ScheduleGrid.jsx frontend/src/pages/timetable/TimetablePage.test.jsx
git commit -m "feat: edit fixed slots and show self-study" -- frontend/src/pages/catalog/catalogState.js frontend/src/pages/catalog/catalogState.test.js frontend/src/pages/catalog/CatalogPage.jsx frontend/src/pages/catalog/CatalogPage.test.jsx frontend/src/components/ScheduleGrid.jsx frontend/src/pages/timetable/TimetablePage.test.jsx
```

---

### Task 5: Full verification and safe local installation

**Files:**
- Replace through repository CLI: `backend/data/timetable-data.json`
- Create through repository backup: `backend/data/backups/backup-*.json`

**Interfaces:**
- Consumes: CLI and sample state from Task 3.
- Produces: local application data containing the generated 15-class timetable with a revision greater than the previously persisted state.

- [ ] **Step 1: Run complete backend verification**

Run: `& 'backend\venv\Scripts\python.exe' -m pytest backend\tests -q`

Expected: all tests PASS.

- [ ] **Step 2: Run complete frontend verification**

Run: `npm test -- --run`

Workdir: `frontend`

Expected: all tests PASS.

- [ ] **Step 3: Run static checks and production build**

Run: `npm run lint`

Run: `npm run build`

Workdir: `frontend`

Expected: both exit with code 0.

- [ ] **Step 4: Stop the currently running local server before data replacement**

Gracefully stop the active `start-local`/Uvicorn process and verify port 8001 is no longer listening. Do not kill unrelated Python or Node processes.

- [ ] **Step 5: Install through `JsonRepository` and inspect the persisted state**

Run: `& 'backend\venv\Scripts\python.exe' backend\sample_15_classes.py --install`

Run: `& 'backend\venv\Scripts\python.exe' -c "from repository import JsonRepository; s=JsonRepository().load(); print(s.revision, len(s.classes), len(s.rooms), len(s.timetable_versions))"`

Expected: positive revision followed by `15 17 1`, and `backend/data/backups` contains the pre-install state.

- [ ] **Step 6: Restart and smoke-test the local application**

Run `start-local.bat`, wait for `/api/state` to return HTTP 200, assert the response has 15 classes and one timetable version, then leave the server running for the user.

- [ ] **Step 7: Final diff and scope audit**

Run: `git diff --check`

Run: `git status --short`

Confirm that unrelated pre-existing changes and the four pre-existing staged deletions were not reverted or bundled into feature commits.
