# Catalog UX and Error Location Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow unrestricted teacher workloads, put newly added catalog records first with visible feedback, give every long-running action a loading state, surface readable structured errors with click-to-location behavior, and keep saved timetable resource indexes valid when a course teacher changes.

**Architecture:** The backend remains authoritative for semantic catalog and timetable validation. Catalog updates rebuild derived teacher assignments and every persisted timetable resource index before the repository performs its existing backup and atomic write. The frontend adds one API error normalizer, one reusable asynchronous button, and catalog-specific error targeting/scrolling components instead of duplicating conversion and loading logic per page.

**Tech Stack:** Python 3, FastAPI, Pydantic 1.x, pytest, React 19, Vite 7, Vitest, Testing Library, Tailwind CSS 4, lucide-react.

**Spec:** `docs/superpowers/specs/2026-08-22-catalog-ux-error-location-design.md`

## Global Constraints

- Do not add a fixed teacher-to-class binding field or any teacher class-count limit.
- Existing absence, busy, substitution, swap, and base-solver priorities must remain unchanged.
- Persisted JSON writes must remain backup-first and atomic through `JsonRepository`.
- Catalog update failure must leave the revision, JSON file, and timetable versions unchanged.
- Never render a JavaScript object directly into React text or an `Error` constructor.
- New teachers and course requirements go first; existing records keep their relative order.
- The working tree already contains user-owned changes. Do not reset, revert, or broadly stage them. Use per-file diffs as checkpoints; do not commit overlapping implementation files.
- The local server may be running on port 8001. Stop/restart it only for final browser verification after tests pass.

## File Structure

- `backend/validation.py`: add authoritative `(class_id, subject_id)` course-requirement uniqueness errors.
- `backend/server.py`: rebuild derived teacher assignments and persisted resource indexes inside catalog updates; annotate timetable validation issues with their version ID.
- `backend/tests/test_validation_structured.py`: cover unrestricted teacher workloads and the two duplicate-requirement variants.
- `backend/tests/test_api_state.py`: cover successful teacher reassignment, atomic rejection of true conflicts, and useful issue locations.
- `frontend/src/api/errors.js`: normalize all supported API error payload shapes into safe UI error details.
- `frontend/src/api/errors.test.js`: unit-test strings, validation reports, diagnostics, and unknown object fallbacks.
- `frontend/src/api/client.js`: throw errors whose `message` is always a string and whose `details` preserve structured issues.
- `frontend/src/api/client.test.js`: verify error normalization is connected to all API calls through `request()`.
- `frontend/src/components/AsyncButton.jsx`: reusable disabled/loading/spinner button.
- `frontend/src/components/AsyncButton.test.jsx`: verify accessible loading behavior and duplicate-click protection.
- `frontend/src/pages/catalog/catalogErrors.js`: turn local form messages and API issue entity IDs into catalog targets and readable Chinese locations.
- `frontend/src/pages/catalog/catalogErrors.test.js`: test duplicate requirement descriptions and entity-to-record resolution.
- `frontend/src/pages/catalog/CatalogErrorPanel.jsx`: render expandable errors and target navigation buttons.
- `frontend/src/pages/catalog/CatalogErrorPanel.test.jsx`: verify reason/location rendering and first/next target callbacks.
- `frontend/src/pages/catalog/useCatalogLocator.js`: register catalog cards and implement tab switch, scroll, focus, and temporary highlight.
- `frontend/src/pages/catalog/CatalogPage.jsx`: prepend new records, add animation/locator attributes, use structured errors and `AsyncButton`.
- `frontend/src/pages/catalog/CatalogPage.test.jsx`: integration tests for prepend/focus/highlight, click-to-location, and save loading.
- `frontend/src/pages/catalog/catalogState.js`: add duplicate `(class_id, subject_id)` local validation messages without changing the existing string-returning API.
- `frontend/src/pages/catalog/catalogState.test.js`: cover same-teacher and different-teacher duplicate messages.
- `frontend/src/pages/generate/GeneratePage.jsx`, `frontend/src/pages/timetable/EditTimetablePage.jsx`, `frontend/src/pages/agent/ChangeAgentPage.jsx`, `frontend/src/pages/dashboard/RecoveryPanel.jsx`: adopt `AsyncButton` for existing asynchronous actions.
- Corresponding existing page tests: verify loading labels and disabled states while promises are pending.
- `frontend/src/index.css`: define record-enter and error-target highlight animations, including reduced-motion behavior.
- `backend/sample_15_classes.py`, `backend/tests/test_sample_15_classes.py`, and the 15-class sample docs: remove wording/assertions that present two classes per ordinary teacher as a system limit while preserving the current deterministic sample allocation.

---

### Task 1: Authoritative course-requirement uniqueness and unrestricted teacher load

**Files:**
- Modify: `backend/validation.py`
- Test: `backend/tests/test_validation_structured.py`

**Interfaces:**
- Consumes: existing `ValidationReport`, `_error()`, `CourseRequirement`, and `validate_catalog(state)`.
- Produces: error codes `duplicate_course_requirement` and `duplicate_course_requirement_teachers`; both include the class ID, subject ID, and every duplicate requirement/teacher ID in `entity_ids`.

- [ ] **Step 1: Write failing backend validation tests**

Add imports for `SchoolClass` and `Teacher`, then add:

```python
def test_catalog_allows_one_teacher_to_serve_more_than_two_classes():
    state, _ = make_two_class_state()
    state.classes.append(SchoolClass(id="class-3", name="Class 3"))
    teacher = next(t for t in state.teachers if t.id == "teacher-li")
    requirement = CourseRequirement(
        id="req-class3-math",
        class_id="class-3",
        subject_id="subject-math",
        teacher_id=teacher.id,
        periods_per_week=2,
    )
    state.course_requirements.append(requirement)
    teacher.teaching_assignment_ids.append(requirement.id)

    assert validate_catalog(state).valid


def test_catalog_rejects_duplicate_class_subject_with_same_teacher():
    state, _ = make_two_class_state()
    duplicate = state.course_requirements[0].copy(
        update={"id": "req-class1-math-copy"}
    )
    state.course_requirements.append(duplicate)
    next(t for t in state.teachers if t.id == duplicate.teacher_id).teaching_assignment_ids.append(duplicate.id)

    issue = next(
        e for e in validate_catalog(state).errors
        if e.code == "duplicate_course_requirement"
    )
    assert {"class-1", "subject-math", "req-class1-math", duplicate.id} <= set(issue.entity_ids)


def test_catalog_rejects_duplicate_class_subject_with_different_teachers():
    state, _ = make_two_class_state()
    other = next(t for t in state.teachers if t.id == "teacher-chen")
    other.qualified_subject_ids.append("subject-math")
    duplicate = state.course_requirements[0].copy(
        update={"id": "req-class1-math-other", "teacher_id": other.id}
    )
    state.course_requirements.append(duplicate)
    other.teaching_assignment_ids.append(duplicate.id)

    issue = next(
        e for e in validate_catalog(state).errors
        if e.code == "duplicate_course_requirement_teachers"
    )
    assert {"teacher-li", "teacher-chen", duplicate.id} <= set(issue.entity_ids)
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_validation_structured.py -q
```

Expected: the unrestricted test passes, while both duplicate tests fail because the new error codes do not exist.

- [ ] **Step 3: Add composite-key validation**

In `validate_catalog`, build groups before the per-requirement loop:

```python
requirements_by_class_subject: Dict[Tuple[str, str], List[CourseRequirement]] = defaultdict(list)
for requirement in state.course_requirements:
    requirements_by_class_subject[(requirement.class_id, requirement.subject_id)].append(requirement)

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
```

Do not count split-course groups in this map.

- [ ] **Step 4: Run focused and catalog regression tests**

Run:

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_validation_structured.py backend\tests\test_base_solver.py -q
```

Expected: all selected tests pass.

- [ ] **Step 5: Review only the task diff**

Run:

```powershell
git diff -- backend/validation.py backend/tests/test_validation_structured.py
```

Confirm no unrelated validation behavior or pre-existing user changes were removed.

---

### Task 2: Rebuild saved timetable indexes during catalog updates

**Files:**
- Modify: `backend/server.py`
- Test: `backend/tests/test_api_state.py`

**Interfaces:**
- Consumes: `rebuild_resource_indexes(state, version)`, `assert_valid_version(state, version)`, `JsonRepository.mutate()`.
- Produces: `_rebuild_catalog_derivations(state: AppState) -> AppState` and version-annotated `ScheduleValidationError` reports.

- [ ] **Step 1: Add a failing successful-reassignment API test**

Create a helper that derives a PUT payload from the live state, then add a qualified replacement teacher and change one requirement:

```python
def catalog_payload_from_state(state):
    return {
        "base_revision": state["revision"],
        **{field: deepcopy(state[field]) for field in CATALOG_FIELDS},
    }


def test_catalog_teacher_change_rebuilds_saved_resource_indexes(tmp_path):
    client = prepared_client(tmp_path)
    preview = generate_preview(client)
    save_preview(client, preview)
    before = client.get("/api/state").json()
    payload = catalog_payload_from_state(before)
    payload["teachers"].append({
        "id": "teacher-math-replacement",
        "name": "Replacement Math",
        "qualified_subject_ids": ["subject-math"],
        "teaching_assignment_ids": ["req-class1-math"],
        "weekly_unavailable_slots": [],
        "homeroom_class_id": None,
        "main_subject_id": None,
    })
    for teacher in payload["teachers"]:
        teacher["teaching_assignment_ids"] = [
            req["id"] for req in payload["course_requirements"]
            if req["teacher_id"] == teacher["id"]
        ]
    target = next(r for r in payload["course_requirements"] if r["id"] == "req-class1-math")
    target["teacher_id"] = "teacher-math-replacement"
    for teacher in payload["teachers"]:
        teacher["teaching_assignment_ids"] = [
            req["id"] for req in payload["course_requirements"]
            if req["teacher_id"] == teacher["id"]
        ]

    response = client.put("/api/catalog", json=payload)

    assert response.status_code == 200
    saved_version = response.json()["timetable_versions"][0]
    used_slots = [
        cell for day in saved_version["teacher_schedules"]["teacher-math-replacement"]
        for cell in day if cell is not None
    ]
    assert used_slots
    assert all(cell["target_id"] == "req-class1-math" for cell in used_slots)
```

- [ ] **Step 2: Add a failing atomic-conflict and location API test**

Use a known valid version where two different teachers teach different classes in the same slot, then change one requirement to the other teacher. Assert:

```python
response = client.put("/api/catalog", json=payload)
assert response.status_code == 422
detail = response.json()["detail"]
issue = next(e for e in detail["errors"] if e["code"] == "teacher_double_booked")
assert issue["weekday"] == 0
assert issue["period"] == 2
assert version_id in issue["entity_ids"]
assert {"teacher-li", "class-1", "class-2"} <= set(issue["entity_ids"])
assert client.get("/api/state").json() == before
```

Build the known state with `make_two_class_state()`, place every required occurrence, put the class-1 Chinese and class-2 Math occurrences at weekday 0 period 2, call `rebuild_resource_indexes`, persist it through `JsonRepository(path).save(state, 0)`, and then create the test client on that path.

- [ ] **Step 3: Run the API tests and verify RED**

Run:

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_api_state.py -q -v
```

Expected: the teacher-change test fails with `resource_index_stale`; the conflict issue lacks the version ID until implementation.

- [ ] **Step 4: Implement catalog derivation rebuilding**

Add:

```python
def _rebuild_catalog_derivations(state: AppState) -> AppState:
    requirement_ids_by_teacher: Dict[str, List[str]] = {
        teacher.id: [] for teacher in state.teachers
    }
    for requirement in state.course_requirements:
        requirement_ids_by_teacher.setdefault(requirement.teacher_id, []).append(requirement.id)
    for teacher in state.teachers:
        teacher.teaching_assignment_ids = requirement_ids_by_teacher.get(teacher.id, [])
    state.timetable_versions = [
        rebuild_resource_indexes(state, version)
        for version in state.timetable_versions
    ]
    return state
```

Call it after assigning all `CATALOG_FIELDS` and before `_assert_valid_persisted_state(state)`.

When `_assert_valid_persisted_state` validates a version, call `validate_timetable_version(state, version)` directly. If the report is invalid, prepend `version.id` to every issue's `entity_ids` when absent, then raise `ScheduleValidationError(report)`. Keep weekday and period unchanged. The repository mutation must raise before `save()` writes, preserving atomicity. Add `validate_timetable_version` to the existing imports from `validation`.

- [ ] **Step 5: Run API and history regression tests**

Run:

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests\test_api_state.py backend\tests\test_api_changes.py backend\tests\test_schedule_service.py -q
```

Expected: all selected tests pass, including the real teacher reassignment path.

- [ ] **Step 6: Review only the task diff**

Run:

```powershell
git diff -- backend/server.py backend/tests/test_api_state.py
```

Confirm catalog updates rebuild indexes but generation, manual version creation, and change application behavior remain unchanged.

---

### Task 3: Normalize API errors without object stringification

**Files:**
- Create: `frontend/src/api/errors.js`
- Create: `frontend/src/api/errors.test.js`
- Modify: `frontend/src/api/client.js`
- Modify: `frontend/src/api/client.test.js`

**Interfaces:**
- Produces: `normalizeApiError(payload, fallbackMessage = "请求失败") -> { message: string, details: Array<ApiErrorDetail> }`.
- `ApiErrorDetail` shape: `{ code, title, message, entity_ids, weekday, period, raw }`.
- `request()` throws `Error` with `status`, `payload`, and `details` properties.

- [ ] **Step 1: Write failing normalization tests**

Add tests for all supported shapes:

```javascript
expect(normalizeApiError({ detail: "保存失败" })).toMatchObject({
  message: "保存失败",
  details: [{ message: "保存失败" }],
});

const validation = normalizeApiError({
  detail: {
    code: "schedule_validation_failed",
    errors: [{
      code: "teacher_double_booked",
      message: "Teacher has multiple assignments in one slot",
      entity_ids: ["version-1", "teacher-1", "class-1", "class-3"],
      weekday: 2,
      period: 1,
    }],
  },
});
expect(validation.message).toContain("教师同一时间被安排了多门课程");
expect(validation.details[0]).toMatchObject({
  code: "teacher_double_booked",
  weekday: 2,
  period: 1,
});

expect(normalizeApiError({ detail: { code: "unknown", foo: "bar" } }).message)
  .toBe("请求失败（unknown）");
expect(normalizeApiError({ detail: { diagnostics: ["no room capacity"] } }).details)
  .toHaveLength(1);
expect(String(normalizeApiError({ detail: { foo: "bar" } }).message))
  .not.toContain("[object Object]");
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm --prefix frontend test -- --run src/api/errors.test.js src/api/client.test.js
```

Expected: import failure because `errors.js` does not exist and client still creates `[object Object]` messages.

- [ ] **Step 3: Implement the normalizer**

Use an explicit code dictionary:

```javascript
const CODE_COPY = {
  duplicate_course_requirement: ["重复录入", "同一班级的同一科目被重复录入"],
  duplicate_course_requirement_teachers: ["任课教师冲突", "同一班级的同一科目配置了两个不同教师"],
  teacher_double_booked: ["教师撞课", "教师同一时间被安排了多门课程"],
  room_double_booked: ["教室冲突", "同一教室在同一时间被重复占用"],
  teacher_unavailable: ["教师不可用", "课程安排在教师设置的不可用时间"],
  revision_conflict: ["数据版本冲突", "数据已被更新，请重新加载后再保存"],
  generation_failed: ["排课计算失败", "当前约束无法生成可行课表"],
  schedule_validation_failed: ["数据不合法", "课表或基础数据校验未通过"],
};
```

Flatten `detail.errors`, `detail.issues`, and `detail.diagnostics`; normalize strings to detail objects; copy `entity_ids`, `weekday`, and `period`; use JSON only for a bounded `raw` diagnostic field, never as the displayed message. The top-level `message` is the explicit detail message, otherwise the first normalized detail message, otherwise `fallbackMessage` plus `code`.

- [ ] **Step 4: Connect `request()` to the normalizer**

Replace the current `new Error(payload?.detail?.message || payload?.detail || "请求失败")` with:

```javascript
const normalized = normalizeApiError(payload, "请求失败");
const error = new Error(normalized.message);
error.status = response.status;
error.payload = payload;
error.details = normalized.details;
throw error;
```

- [ ] **Step 5: Add an integration assertion to `client.test.js`**

Mock a 422 response with a structured validation report and assert:

```javascript
await expect(api.updateCatalog({})).rejects.toMatchObject({
  message: expect.stringContaining("教师同一时间被安排了多门课程"),
  details: [expect.objectContaining({ code: "teacher_double_booked" })],
});
```

- [ ] **Step 6: Run focused frontend tests**

Run:

```powershell
npm --prefix frontend test -- --run src/api/errors.test.js src/api/client.test.js
```

Expected: all focused tests pass and no assertion contains `[object Object]`.

---

### Task 4: Structured catalog errors, click-to-location, and newest-first cards

**Files:**
- Create: `frontend/src/pages/catalog/catalogErrors.js`
- Create: `frontend/src/pages/catalog/catalogErrors.test.js`
- Create: `frontend/src/pages/catalog/CatalogErrorPanel.jsx`
- Create: `frontend/src/pages/catalog/CatalogErrorPanel.test.jsx`
- Create: `frontend/src/pages/catalog/useCatalogLocator.js`
- Modify: `frontend/src/pages/catalog/catalogState.js`
- Modify: `frontend/src/pages/catalog/catalogState.test.js`
- Modify: `frontend/src/pages/catalog/CatalogPage.jsx`
- Modify: `frontend/src/pages/catalog/CatalogPage.test.jsx`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Produces: `buildCatalogErrorDetails(form, messagesOrDetails) -> CatalogErrorDetail[]`.
- `CatalogErrorDetail` extends API detail with `location` and `targets`, where each target is `{ tab, entityId, field }`.
- Produces: `useCatalogLocator(setActiveTab) -> { registerEntity, locateTarget, highlightedEntityId, markNewEntity }`.

- [ ] **Step 1: Add failing local duplicate tests**

In `catalogState.test.js`, create two requirements sharing `class_id` and `subject_id`. Assert exact message classes:

```javascript
expect(validateCatalogForm(sameTeacherForm)).toContain(
  '课程要求重复录入：高一(1)班 / 语文'
);
expect(validateCatalogForm(differentTeacherForm)).toContain(
  '高一(1)班的语文配置了两个不同的任课教师：张老师、李老师'
);
```

- [ ] **Step 2: Implement local composite-key validation**

After maps are built and before individual requirement checks:

```javascript
const requirementsByClassSubject = new Map();
courseRequirements.forEach((req) => {
  const key = `${req.class_id}\u0000${req.subject_id}`;
  const list = requirementsByClassSubject.get(key) || [];
  list.push(req);
  requirementsByClassSubject.set(key, list);
});
for (const duplicates of requirementsByClassSubject.values()) {
  if (duplicates.length < 2) continue;
  const className = classMap.get(duplicates[0].class_id)?.name || duplicates[0].class_id;
  const subjectName = subjectMap.get(duplicates[0].subject_id)?.name || duplicates[0].subject_id;
  const teacherNames = [...new Set(duplicates.map((req) =>
    teacherMap.get(req.teacher_id)?.name || req.teacher_id
  ))];
  errors.push(
    teacherNames.length > 1
      ? `${className}的${subjectName}配置了两个不同的任课教师：${teacherNames.join("、")}`
      : `课程要求重复录入：${className} / ${subjectName}`
  );
}
```

- [ ] **Step 3: Write failing target-building tests**

Cover a local duplicate and backend issue:

```javascript
const details = buildCatalogErrorDetails(form, [{
  code: "duplicate_course_requirement_teachers",
  entity_ids: ["c1", "s1", "req1", "req2", "t1", "t2"],
  message: "同一班级的同一科目配置了两个不同教师",
}]);
expect(details[0].location).toBe("基础数据 → 课程要求 → 高一(1)班 / 语文");
expect(details[0].targets).toEqual([
  { tab: "requirements", entityId: "req1", field: "teacher_id" },
  { tab: "requirements", entityId: "req2", field: "teacher_id" },
]);
```

Also test `teacher_double_booked` with a version ID, teacher ID, two class IDs, `weekday: 2`, `period: 1`, expecting a location containing the resolved timetable name, “周三第2节”, teacher name, and both class names.

- [ ] **Step 4: Implement error target resolution**

Build ID maps for classes, subjects, teachers, requirements, split blocks, and timetable versions. Resolve known codes by inspecting `entity_ids`. For existing string-only local messages, resolve `课程要求 #N`, `教师 #N`/quoted teacher name, `班级 #N`, and `走班课程块 #N`. Unknown messages receive a safe location of “基础数据” and no target.

- [ ] **Step 5: Write and implement `CatalogErrorPanel` tests**

Render two targets and assert the panel calls `onLocate` first with target 0 and then target 1 when “查看下一处” is clicked:

```jsx
<CatalogErrorPanel
  errors={[{
    code: "duplicate_course_requirement",
    title: "重复录入",
    message: "课程要求重复录入",
    location: "基础数据 → 课程要求",
    targets: [firstTarget, secondTarget],
  }]}
  onLocate={onLocate}
/>
```

The component must render buttons rather than clickable `<li>` elements so keyboard users can activate location actions.

- [ ] **Step 6: Write failing `CatalogPage` interaction tests**

Add tests that:

1. click “添加教师” and assert the first teacher card is the newly created teacher;
2. click “添加课程要求” and assert the first requirement card is new;
3. mock `HTMLElement.prototype.scrollIntoView` and assert it is called;
4. assert the new name/class field receives focus;
5. reject save with `error.details` containing duplicate requirement targets, click the displayed error, and assert the requirements tab becomes active and the target card receives `data-error-highlight="true"`.

Update the existing “supports creating and configuring course requirements” test to select controls within the first requirement card rather than using the last element of each global combobox list.

- [ ] **Step 7: Implement the locator hook and newest-first behavior**

Use refs keyed by stable entity IDs. The hook's locator sequence is:

```javascript
setActiveTab(target.tab);
requestAnimationFrame(() => {
  const node = entityRefs.current.get(target.entityId);
  node?.scrollIntoView({ behavior: "smooth", block: "center" });
  node?.querySelector(`[data-field="${target.field}"]`)?.focus();
  setHighlightedEntityId(target.entityId);
  window.setTimeout(() => setHighlightedEntityId(null), 1600);
});
```

Change additions from `[...form.teachers, newTeacher]` to `[newTeacher, ...form.teachers]` and from `[...form.course_requirements, newRequirement]` to `[newRequirement, ...form.course_requirements]`. Register card refs and add `data-entity-id`, `data-error-highlight`, and `data-field` attributes.

Immediately after inserting a record, call `markNewEntity({ tab: "teachers", entityId: newTeacher.id, field: "name" })` or `markNewEntity({ tab: "requirements", entityId: newRequirement.id, field: "class_id" })`. The hook waits for the next render, then scrolls, focuses, applies `catalog-record-enter`, and clears the new-record state after 400 milliseconds.

- [ ] **Step 8: Add animations with reduced-motion support**

In `index.css` add:

```css
@keyframes catalog-record-enter {
  from { opacity: 0; transform: translateY(-10px); border-color: rgb(16 185 129 / .9); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes catalog-error-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgb(244 63 94 / 0); }
  40% { box-shadow: 0 0 0 4px rgb(244 63 94 / .45); }
}
.catalog-record-enter { animation: catalog-record-enter 400ms ease-out; }
.catalog-error-highlight { animation: catalog-error-pulse 500ms ease-in-out 3; border-color: rgb(244 63 94 / .9); }
@media (prefers-reduced-motion: reduce) {
  .catalog-record-enter, .catalog-error-highlight { animation: none; }
}
```

- [ ] **Step 9: Run catalog tests**

Run:

```powershell
npm --prefix frontend test -- --run src/pages/catalog/catalogState.test.js src/pages/catalog/catalogErrors.test.js src/pages/catalog/CatalogErrorPanel.test.jsx src/pages/catalog/CatalogPage.test.jsx
```

Expected: all catalog tests pass, and the old string-based `validateCatalogForm` consumers remain compatible.

---

### Task 5: Reusable asynchronous buttons across long operations

**Files:**
- Create: `frontend/src/components/AsyncButton.jsx`
- Create: `frontend/src/components/AsyncButton.test.jsx`
- Modify: `frontend/src/pages/catalog/CatalogPage.jsx`
- Modify: `frontend/src/pages/generate/GeneratePage.jsx`
- Modify: `frontend/src/pages/timetable/EditTimetablePage.jsx`
- Modify: `frontend/src/pages/agent/ChangeAgentPage.jsx`
- Modify: `frontend/src/pages/dashboard/RecoveryPanel.jsx`
- Test: corresponding existing page tests.

**Interfaces:**
- Produces: `<AsyncButton loading loadingLabel className disabled>children</AsyncButton>`.
- The rendered native button has `disabled={disabled || loading}` and `aria-busy={loading}`.

- [ ] **Step 1: Write the failing shared component test**

```jsx
const onClick = vi.fn();
render(
  <AsyncButton loading loadingLabel="保存中…" onClick={onClick}>
    保存基础数据
  </AsyncButton>
);
const button = screen.getByRole("button", { name: "保存中…" });
expect(button).toBeDisabled();
expect(button).toHaveAttribute("aria-busy", "true");
expect(within(button).getByTestId("loading-spinner")).toHaveClass("animate-spin");
await userEvent.click(button);
expect(onClick).not.toHaveBeenCalled();
```

- [ ] **Step 2: Implement `AsyncButton`**

```jsx
import React from "react";
import { LoaderCircle } from "lucide-react";

export default function AsyncButton({
  loading = false,
  loadingLabel = "处理中…",
  disabled = false,
  children,
  className = "",
  ...props
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading ? "true" : "false"}
      className={className}
    >
      {loading ? (
        <>
          <LoaderCircle data-testid="loading-spinner" aria-hidden="true" className="animate-spin" size={16} />
          <span>{loadingLabel}</span>
        </>
      ) : children}
    </button>
  );
}
```

- [ ] **Step 3: Run the component test**

Run:

```powershell
npm --prefix frontend test -- --run src/components/AsyncButton.test.jsx
```

Expected: PASS.

- [ ] **Step 4: Add pending-promise tests to each page**

Use a deferred promise:

```javascript
let resolveRequest;
api.updateCatalog.mockReturnValueOnce(new Promise((resolve) => { resolveRequest = resolve; }));
fireEvent.click(screen.getByRole("button", { name: "保存基础数据" }));
expect(screen.getByRole("button", { name: "保存中…" })).toBeDisabled();
resolveRequest(nextState);
```

Repeat with the page's operation and label:

- Catalog: “保存中…” and “保存设置中…”;
- Generate: “生成中…” and “保存中…”;
- Edit timetable: “正在创建…”;
- Change Agent: “计算方案中…” and “应用中…”;
- Recovery: “恢复中…”.

- [ ] **Step 5: Replace only asynchronous action buttons**

Import `AsyncButton` and preserve each existing class name and click handler. Do not replace ordinary navigation, add, remove, cancel, or form buttons. Pass the existing pending state as `loading` and the exact label from Step 4 as `loadingLabel`.

- [ ] **Step 6: Run affected page tests**

Run:

```powershell
npm --prefix frontend test -- --run src/pages/catalog/CatalogPage.test.jsx src/pages/generate/GeneratePage.test.jsx src/pages/timetable/EditTimetablePage.test.jsx src/pages/agent/ChangeAgentPage.test.jsx src/pages/dashboard/RecoveryPanel.test.jsx
```

Expected: all affected page tests pass and accessible names remain stable when idle.

---

### Task 6: Remove the sample-only teacher cap language and verify the complete workflow

**Files:**
- Modify: `backend/sample_15_classes.py`
- Modify: `backend/tests/test_sample_15_classes.py`
- Modify: `docs/superpowers/specs/2026-08-22-15-class-test-sample-design.md`
- Modify: `docs/superpowers/plans/2026-08-22-15-class-test-sample.md`
- Test: full backend and frontend suites.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: documentation that distinguishes deterministic sample allocation from product validation rules.

- [ ] **Step 1: Remove only the cap assertion and misleading comments**

Delete the test assertion equivalent to:

```python
assert all(
    len(class_ids_for_teacher(state, teacher.id)) <= 2
    for teacher in non_pe_teachers
)
```

Replace generator/docs wording such as “普通教师最多负责 2 个班” with:

```text
测试样例按相邻班级成组分配普通教师，以生成稳定、易读的数据；这只是样例分配方式，不是系统限制。操作者可以让同一教师承担任意数量班级的课程要求。
```

Do not change the existing deterministic teacher allocation algorithm or regenerate the installed data solely for this wording change.

- [ ] **Step 2: Run the complete backend suite**

Run:

```powershell
& 'backend\venv\Scripts\python.exe' -m pytest backend\tests -q
```

Expected: all backend tests pass.

- [ ] **Step 3: Run the complete frontend suite, lint, and build**

Run:

```powershell
npm --prefix frontend test -- --run
npm --prefix frontend run lint
npm --prefix frontend run build
```

Expected: all tests pass, ESLint exits 0, and Vite produces `frontend/dist` successfully.

- [ ] **Step 4: Restart the local app and verify the reported teacher change**

Restart through the project launcher so the freshly built frontend is served. In the UI:

1. open “基础数据 → 课程要求”;
2. change 高一(3)班 / 语文 from 语文老师02 to 语文老师01;
3. click “保存基础数据”;
4. confirm the spinner and “保存中…” appear;
5. confirm the save succeeds and the revision increases;
6. reload and confirm the teacher remains 语文老师01;
7. inspect the saved timetable's teacher view to confirm its resource index uses 语文老师01.

- [ ] **Step 5: Verify duplicate error location in the browser without persisting bad data**

Create a temporary duplicate 高一(3)班 / 语文 requirement, click save, and verify:

- the popup says whether the teachers are the same or different;
- it displays “基础数据 → 课程要求 → 高一(3)班 / 语文”;
- clicking the error scrolls to and highlights the first record;
- “查看下一处” highlights the second record;
- `[object Object]` is absent;
- the failed save does not increase the revision.

Delete the unsaved duplicate in the form before finishing.

- [ ] **Step 6: Review the complete scoped diff**

Run:

```powershell
git diff -- backend/validation.py backend/server.py backend/tests/test_validation_structured.py backend/tests/test_api_state.py backend/sample_15_classes.py backend/tests/test_sample_15_classes.py frontend/src/api frontend/src/components/AsyncButton.jsx frontend/src/components/AsyncButton.test.jsx frontend/src/pages/catalog frontend/src/pages/generate/GeneratePage.jsx frontend/src/pages/timetable/EditTimetablePage.jsx frontend/src/pages/agent/ChangeAgentPage.jsx frontend/src/pages/dashboard/RecoveryPanel.jsx frontend/src/index.css docs/superpowers/specs/2026-08-22-15-class-test-sample-design.md docs/superpowers/plans/2026-08-22-15-class-test-sample.md
```

Confirm there is no teacher class-count restriction, no object stringification, no missing loading state in the listed async operations, and no unrelated user-owned changes were removed.

## Execution Decision

The user explicitly requested direct modification in the current session, so execute this plan inline with `superpowers:executing-plans`. Do not dispatch subagents. Use `superpowers:test-driven-development` for every implementation task and `superpowers:verification-before-completion` before reporting success.
