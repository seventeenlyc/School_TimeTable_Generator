# Teacher Comfort, Teacher Export, and Student Diversity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make generated timetables prioritize eligible teachers' compact daily schedules, reserve the homeroom meeting, diversify class schedules and self-study days, and export one timetable sheet per teacher.

**Architecture:** Keep all persisted models and APIs backward compatible. Add a pure scheduling-policy module for subject-tier classification, enforce the homeroom meeting as a hard solver/validation rule, and replace the current flat soft objective with three provably ordered penalty groups. Extend the existing Excel export module and timetable page without changing stored timetable shapes.

**Tech Stack:** Python 3.11, Pydantic, OR-Tools CP-SAT, pytest, React 19, Vitest, Testing Library, ExcelJS, Electron Builder.

**Spec:** `docs/superpowers/specs/2026-08-24-teacher-comfort-and-teacher-export-design.md`

## Global Constraints

- Working days remain fixed at five.
- Morning is periods 1-5; afternoon starts at period 6.
- Strong teacher subjects are Chinese, Math, English, Physics, and History.
- Light teacher subjects are Chemistry, Biology, Politics, and Geography.
- Art, sports, information/computer, and general-technology teachers receive no automatic teacher-comfort penalty.
- User-configured same-half-day pairs remain hard constraints for every subject tier.
- Chinese and Math prefer morning; only extra Thursday Math may use periods 6-7 without penalty when Thursday morning already contains Math.
- Teacher comfort dominates all student-side soft objectives.
- Existing user-owned dirty changes, especially `backend/samples/15-class-demo.json`, must be preserved.
- Do not alter persisted schema or API payload shapes.

---

### Task 1: Pure teacher comfort policy

**Files:**
- Create: `backend/scheduling_policy.py`
- Create: `backend/tests/test_scheduling_policy.py`

**Interfaces:**
- Produces: `subject_comfort_tier(subject_name: str) -> int` where `2` is strong, `1` is light, and `0` is exempt/unclassified.
- Produces: `teacher_comfort_tiers(state: AppState) -> Dict[str, int]`, derived from ordinary requirements and split groups with the maximum tier winning.
- Consumes: `AppState.subjects`, `course_requirements`, and `split_course_blocks`.

- [ ] **Step 1: Write failing family-classification tests**

Test literal cases for exact and suffixed names:

```python
@pytest.mark.parametrize("name", ["语文", "数学", "英语", "物理", "历史", "物理（走班）"])
def test_strong_subject_families(name):
    assert subject_comfort_tier(name) == 2

@pytest.mark.parametrize("name", ["化学", "生物", "政治", "地理（选科）"])
def test_light_subject_families(name):
    assert subject_comfort_tier(name) == 1

@pytest.mark.parametrize("name", ["音乐", "美术", "体育", "信息技术", "计算机", "通用技术"])
def test_exempt_subject_families(name):
    assert subject_comfort_tier(name) == 0
```

- [ ] **Step 2: Run the test and verify RED**

Run: `backend\.venv\Scripts\python.exe -m pytest backend/tests/test_scheduling_policy.py -q`

Expected: import failure because `scheduling_policy.py` does not exist.

- [ ] **Step 3: Implement the minimal pure classifier**

Use exact family matching plus the established Chinese-parenthesis suffix convention. Unknown subjects default to tier `0`.

- [ ] **Step 4: Add and fail a real AppState aggregation test**

Create teachers whose assignments are respectively Math+PE, Chemistry+PE, PE-only, and split-History. Assert returned tiers are `2`, `1`, `0`, and `2`.

- [ ] **Step 5: Implement aggregation and verify GREEN**

Run the same pytest command and require all policy tests to pass.

- [ ] **Step 6: Inspect the task diff**

Run: `git diff --check -- backend/scheduling_policy.py backend/tests/test_scheduling_policy.py`

Do not stage unrelated dirty files.

### Task 2: Homeroom Monday meeting as a hard rule

**Files:**
- Modify: `backend/base_solver.py`
- Modify: `backend/validation.py`
- Modify: `backend/tests/test_base_solver.py`
- Modify: `backend/tests/test_validation_structured.py`

**Interfaces:**
- Produces: `_add_homeroom_meeting_constraints(model, state, teacher_variables) -> None`.
- Produces: validation error code `homeroom_meeting_conflict` for teaching at weekday `0`, period `1`.
- Consumes: existing `teacher_variables` and `teacher_occupancy` maps, including normal and split assignments.

- [ ] **Step 1: Write a failing solver test**

Build a homeroom teacher with a flexible weekly lesson and enough alternatives; assert the generated teacher schedule is empty at Monday period 2.

- [ ] **Step 2: Verify the solver test fails for the missing rule**

Run only the new pytest node and confirm the current solver may occupy Monday period 2.

- [ ] **Step 3: Implement the hard solver block**

For every teacher with `homeroom_class_id`, constrain the sum of ordinary and split teacher variables at `(weekday=0, period=1)` to zero when the configured day has at least two periods.

- [ ] **Step 4: Write failing validation tests**

Cover an ordinary lesson and a split-group assignment for a homeroom teacher at Monday period 2. Both must report `homeroom_meeting_conflict`; a non-homeroom teacher at the same slot remains valid.

- [ ] **Step 5: Implement version and catalog validation**

Reject saved schedules containing the conflict and report a catalog error when a homeroom teacher owns a fixed course at the meeting slot.

- [ ] **Step 6: Verify the targeted backend tests**

Run:

```powershell
backend\.venv\Scripts\python.exe -m pytest backend/tests/test_base_solver.py backend/tests/test_validation_structured.py -q
```

Expected: all selected tests pass.

### Task 3: Tiered teacher-first and student-diversity objective

**Files:**
- Modify: `backend/base_solver.py`
- Modify: `backend/tests/test_base_solver.py`
- Consume: `backend/scheduling_policy.py`

**Interfaces:**
- Replaces: `_add_soft_objective_terms(...) -> List[LinearExpr]` with a grouped objective builder that accepts `normal`, `split`, `class_variables`, and `teacher_variables`.
- Produces: one CP-SAT objective with primary-teacher, secondary-teacher, and student groups scaled so one point in an earlier group exceeds the full maximum of later groups.

- [ ] **Step 1: Write failing teacher-comfort behavior tests**

Use small literal states with fixed alternative slots to prove:

- a strong Math teacher selects same-half over a cross-half option;
- when crossing is unavoidable, the smaller period span wins;
- a light Chemistry teacher selects the tighter span but has no same-half base penalty;
- a PE-only teacher's placement is decided only by other objectives;
- a teacher with a Math ordinary requirement and PE requirement is classified/optimized as strong;
- split-group History teaching participates in the same occupancy calculation.

- [ ] **Step 2: Run the new tests and verify RED**

Run their exact pytest nodes and confirm failures reflect the current missing objective.

- [ ] **Step 3: Build teacher occupancy and primary/secondary penalty groups**

For each eligible teacher/day:

- build per-period occupied booleans from existing teacher variables;
- strong tier: add morning-and-afternoon overlap to the primary group;
- strong tier: add large-distance pair penalties and compactness penalties;
- light tier: add only lower relative pair-distance penalties;
- tier `0`: add no teacher-comfort terms.

Use maximum-score accounting to scale groups lexicographically inside a single objective and keep the 30-second solver limit.

- [ ] **Step 4: Write failing Chinese/Math morning tests**

Assert Chinese and Math select periods 1-5 when feasible. Add two Thursday Math fixtures: an extra Math lesson may use period 6/7 without penalty when Thursday morning already has Math, while a lone Thursday Math still prefers morning.

- [ ] **Step 5: Implement morning preference for ordinary and split variables**

Use subject-family matching. Make the Thursday exception conditional on a morning Math occurrence for the same class/day.

- [ ] **Step 6: Write failing student-side tests**

Cover:

- a course no longer repeats the same period on all possible weekdays;
- five self-study cells distribute as one per weekday when hard constraints permit;
- seven self-study cells prefer a `2,2,1,1,1` day-count multiset;
- teacher same-half comfort wins when it conflicts with a student diversity improvement.

- [ ] **Step 7: Implement student penalties and remove the old first-period preference**

Add pairwise same-day empty-cell penalties, repeated-course-period penalties for ordinary and split courses, and retain the existing isolated-gap penalty. Delete the `missed_main_subject_*` objective entirely.

- [ ] **Step 8: Verify all solver tests**

Run: `backend\.venv\Scripts\python.exe -m pytest backend/tests/test_base_solver.py backend/tests/test_scheduling_policy.py -q`

Expected: all pass with deterministic results.

### Task 4: Teacher Excel workbook

**Files:**
- Modify: `frontend/src/domain/exportTimetable.js`
- Modify: `frontend/src/domain/exportTimetable.test.js`

**Interfaces:**
- Produces: `makeTeacherExportFilename(versionName) -> string`.
- Produces: `buildTeacherTimetableWorkbook(state, version) -> ExcelJS.Workbook`.
- Produces: `downloadTeacherTimetables(state, version) -> Promise<void>`.
- Consumes: `version.teacher_schedules`, existing schedule indexes, and homeroom metadata.

- [ ] **Step 1: Write failing workbook tests**

Build a workbook fixture containing duplicate teacher names, an ordinary lesson, a split assignment, an empty slot, and a homeroom teacher. Assert one sheet per teacher, unique legal sheet names, ordinary text `科目\n班级`, split text `走班：科目\n来源班级`, `空闲`, and Monday period 2 `会议`.

- [ ] **Step 2: Verify RED**

Run: `npm --prefix frontend test -- --run src/domain/exportTimetable.test.js`

Expected: missing teacher-export function failures.

- [ ] **Step 3: Implement the teacher workbook by reusing class-export styling helpers**

Preserve the existing class export unchanged. The teacher filename must end in `_全部教师.xlsx`; workbook creation must reject missing state/version or an empty teacher catalog with a Chinese error.

- [ ] **Step 4: Verify GREEN**

Run the same Vitest command and require all export tests to pass.

### Task 5: Timetable page teacher-export action

**Files:**
- Modify: `frontend/src/pages/timetable/TimetablePage.jsx`
- Modify: `frontend/src/pages/timetable/TimetablePage.test.jsx`

**Interfaces:**
- Consumes: `downloadTeacherTimetables(state, version)` through the existing dynamic export-module import pattern.
- Produces: visible button `导出全部教师课表` with success/error toasts.

- [ ] **Step 1: Write failing page tests**

Assert both class and teacher export buttons render. Click the teacher button and assert the teacher download function receives current `state` and `version`; add a rejection case that shows the error toast.

- [ ] **Step 2: Verify RED**

Run: `npm --prefix frontend test -- --run src/pages/timetable/TimetablePage.test.jsx`

- [ ] **Step 3: Implement the action**

Add an independent `AsyncButton` beside the class export action, preserve responsive layout, and avoid shared loading state that disables the wrong export.

- [ ] **Step 4: Verify GREEN**

Run the same Vitest command and require all page tests to pass.

### Task 6: Full verification and desktop synchronization

**Files:**
- Verify: all modified backend/frontend files.
- Build output: `frontend/dist`, `release/` and installed desktop resources.
- Preserve: `backend/data/timetable-data.json` and user backups.

**Interfaces:**
- Produces: fresh test, lint, build, package, and installed-desktop evidence.

- [ ] **Step 1: Run full backend verification**

```powershell
backend\.venv\Scripts\python.exe -m pytest backend/tests -q
backend\.venv\Scripts\python.exe -m compileall -q backend
```

- [ ] **Step 2: Run full frontend and Electron verification**

```powershell
npm --prefix frontend test -- --run
npm --prefix frontend run lint
npm --prefix frontend run build
node --test electron/main.cache.test.js
```

- [ ] **Step 3: Generate a representative timetable and inspect policy metrics**

Run the real 15-class data through generation without overwriting `backend/data/timetable-data.json`. Report strong-teacher cross-half day counts, maximum daily span, Chinese/Math afternoon exceptions, self-study counts by weekday, and repeated same-period counts.

- [ ] **Step 4: Build and synchronize the desktop package**

Follow `electron/README.md`: build the frontend first, then run the Electron Windows x64 builder. Stop the running desktop process only when required to replace installed resources, preserve `%APPDATA%` data, install/synchronize the fresh build, and relaunch hidden/background services as appropriate.

- [ ] **Step 5: Verify the installed desktop build**

Confirm the installed application loads the fresh frontend, exposes the teacher-export button, and the backend source bundled in desktop resources contains the new policy and meeting validation. Do not claim completion without fresh command output.

- [ ] **Step 6: Review the final diff**

Run `git diff --check` and `git status --short`. Confirm `backend/samples/15-class-demo.json` and all unrelated existing modifications were preserved.
