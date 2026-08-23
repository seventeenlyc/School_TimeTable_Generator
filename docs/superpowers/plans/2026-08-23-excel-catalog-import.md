# Excel Catalog Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a browser-only Excel import workflow for teacher and course-requirement data, with a validated preview, deterministic name-based merging, readable cell-level errors, and no direct persistence until the existing save action is used.

**Architecture:** ExcelJS parses each workbook into source-aware normalized rows in a focused parser module. A pure merge module plans one atomic update against the current catalog form and returns a preview summary, errors, and created entity IDs. A modal component owns file selection and preview state, while `CatalogPage` only opens it and applies the returned draft.

**Tech Stack:** React 19, Vitest, Testing Library, ExcelJS 4.4, Tailwind CSS, existing catalog state and locator utilities.

**Spec:** `docs/superpowers/specs/2026-08-23-excel-catalog-import-design.md`

## Global Constraints

- The workflow must be completely offline; workbook bytes never leave the browser.
- Use the existing `exceljs` dependency and add no runtime dependency.
- Import updates only the front-end draft; persistence remains the existing `PUT /api/catalog` save flow.
- New and imported course requirements always use `consecutive_periods: 1`; existing non-1 values are preserved when a matching requirement is updated.
- Do not modify backend APIs, backend domain models, JSON schema, or the solver.
- Do not stage or change the unrelated dirty files `LICENSE`, `README.md`, `backend/server.py`, `electron/`, or `release/`.

---

### Task 1: Workbook parsing and source-aware validation

**Files:**
- Create: `frontend/src/pages/catalog/excelCatalogImport.js`
- Create: `frontend/src/pages/catalog/excelCatalogImport.test.js`

**Interfaces:**
- Produces: `parseTeacherWorkbook(arrayBuffer, fileName)` returning `Promise<{ rows: TeacherImportRow[], errors: ImportError[], sheetName: string }>`.
- Produces: `parseRequirementWorkbook(arrayBuffer, fileName)` returning `Promise<{ rows: RequirementImportRow[], errors: ImportError[], sheetName: string }>`.
- Produces: `formatImportError(error)` returning a render-safe Chinese string.
- `TeacherImportRow` contains `name`, `homeroomClassName`, `mainSubjectName`, and `source`.
- `RequirementImportRow` contains `className`, `subjectName`, `teacherName`, `roomName`, `periodsPerWeek`, `fixedSlots`, and `source`. It deliberately contains no imported consecutive-period value.
- `ImportError` contains `fileType`, `fileName`, `sheetName`, `row`, `column`, `value`, and `message`.

- [ ] **Step 1: Write failing parser tests**

Create workbook fixtures in memory with ExcelJS and assert the exact normalized output:

```js
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  formatImportError,
  parseRequirementWorkbook,
  parseTeacherWorkbook,
} from "./excelCatalogImport";

async function workbookBuffer(headers, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  return workbook.xlsx.writeBuffer();
}

it("parses teacher rows and ignores blank rows", async () => {
  const buffer = await workbookBuffer(
    ["教师姓名", "班主任班级", "主教学科"],
    [[" 语文老师01 ", "1班", "语文"], [null, null, null]],
  );
  const result = await parseTeacherWorkbook(buffer, "教师.xlsx");
  expect(result.errors).toEqual([]);
  expect(result.rows).toEqual([
    expect.objectContaining({
      name: "语文老师01",
      homeroomClassName: "1班",
      mainSubjectName: "语文",
      source: expect.objectContaining({ sheetName: "Sheet1", row: 2 }),
    }),
  ]);
});

it("maps slash and one-based fixed slots while ignoring imported consecutive values", async () => {
  const buffer = await workbookBuffer(
    ["班级", "科目", "教师", "教室", "周课时", "连堂课时", "固定时间（星期*节次）"],
    [["1班", "语文", "小明", "1班教室", 6, 9, "/"], ["1班", "班会", "小红", "1班教室", "1", 0, "1*8，2*1"]],
  );
  const result = await parseRequirementWorkbook(buffer, "课程要求.xlsx");
  expect(result.errors).toEqual([]);
  expect(result.rows[0]).not.toHaveProperty("consecutivePeriods");
  expect(result.rows[0].fixedSlots).toEqual([]);
  expect(result.rows[1]).toMatchObject({
    periodsPerWeek: 1,
    fixedSlots: [{ weekday: 0, period: 7 }, { weekday: 1, period: 0 }],
  });
});
```

Also cover missing headers, non-positive/non-integer weekly periods, invalid fixed-slot text, weekday outside 1–6, period outside configured spreadsheet convention 1–20, identical duplicates being deduplicated, conflicting duplicate teacher names, conflicting duplicate class+subject requirements, and `formatImportError` never returning `[object Object]`.

- [ ] **Step 2: Run parser tests and verify failure**

Run:

```powershell
cd D:\School_TimeTable_Generator\frontend
npm test -- --run src/pages/catalog/excelCatalogImport.test.js
```

Expected: FAIL because `excelCatalogImport.js` does not exist.

- [ ] **Step 3: Implement the minimal parser**

Use `new ExcelJS.Workbook()` and `await workbook.xlsx.load(arrayBuffer)`. Normalize cell values through one helper that supports string, number, formula result, rich text, null, and trims strings. Match required headers by normalized text and use the first non-empty worksheet. Parse fixed slots with:

```js
const FIXED_SLOT = /^(\d+)\s*\*\s*(\d+)$/;

export function parseFixedSlots(value, source) {
  const text = normalizeCellText(value);
  if (!text || text === "/") return { slots: [], errors: [] };
  return text.split(/[，,、;；]+/).reduce((result, token) => {
    const match = token.trim().match(FIXED_SLOT);
    if (!match) {
      result.errors.push(importError(source, "固定时间（星期*节次）", value, `格式应为“星期*节次”，例如 1*8`));
      return result;
    }
    const weekday = Number(match[1]);
    const period = Number(match[2]);
    if (weekday < 1 || weekday > 6 || period < 1 || period > 20) {
      result.errors.push(importError(source, "固定时间（星期*节次）", value, "星期应为 1–6，节次应为正整数"));
      return result;
    }
    result.slots.push({ weekday: weekday - 1, period: period - 1 });
    return result;
  }, { slots: [], errors: [] });
}
```

Detect duplicate keys after parsing. Identical normalized rows increment a returned `skipped` count; conflicting rows emit one error per source row so the operator sees every location.

- [ ] **Step 4: Run parser tests and verify pass**

Run the command from Step 2. Expected: all parser tests PASS.

- [ ] **Step 5: Commit parser and tests**

```powershell
git add frontend/src/pages/catalog/excelCatalogImport.js frontend/src/pages/catalog/excelCatalogImport.test.js
git commit -m "feat: parse catalog Excel imports"
```

---

### Task 2: Pure catalog merge planner

**Files:**
- Create: `frontend/src/pages/catalog/catalogImportMerge.js`
- Create: `frontend/src/pages/catalog/catalogImportMerge.test.js`
- Modify: `frontend/src/pages/catalog/excelCatalogImport.js`
- Modify: `frontend/src/pages/catalog/excelCatalogImport.test.js`

**Interfaces:**
- Consumes parser rows from Task 1.
- Produces: `planCatalogImport(form, parsed)` returning `{ nextForm, summary, errors, created }`.
- `summary` contains `{ added, updated, skipped }`; `added` is keyed by `classes`, `subjects`, `rooms`, `teachers`, and `courseRequirements`.
- `created` contains arrays of newly created IDs under the same catalog keys so `CatalogPage` can animate the first imported record.
- The merge module receives `createId` as an optional dependency for deterministic tests: `planCatalogImport(form, parsed, { createId: createIdFn } = {})`.

- [ ] **Step 1: Write failing merge tests**

Use a small form containing `1班`, `语文`, `张老师`, `101`, and one existing requirement. Assert:

```js
const result = planCatalogImport(form, {
  teacherRows: [{ name: "张老师", homeroomClassName: "2班", mainSubjectName: "数学", source }],
  requirementRows: [{
    className: "2班",
    subjectName: "数学",
    teacherName: "李老师",
    roomName: "2班教室",
    periodsPerWeek: 7,
    fixedSlots: [],
    source,
  }],
  skipped: 0,
}, { createId: (() => { let n = 0; return (prefix) => `${prefix}-${++n}`; })() });

expect(result.errors).toEqual([]);
expect(result.nextForm.classes[0].name).toBe("2班");
expect(result.nextForm.subjects[0].name).toBe("数学");
expect(result.nextForm.rooms[0].name).toBe("2班教室");
expect(result.nextForm.teachers.find((item) => item.name === "李老师").qualified_subject_ids)
  .toContain(result.nextForm.subjects[0].id);
expect(result.nextForm.course_requirements[0]).toMatchObject({
  periods_per_week: 7,
  consecutive_periods: 1,
});
```

Add tests proving that same-name teachers retain `weekly_unavailable_slots` and existing qualifications; non-empty spreadsheet fields update homeroom/main subject; blank homeroom does not clear an existing assignment; matching class+subject requirements retain ID and historical `consecutive_periods`; fixed slots and teacher/room/week periods update; no existing entity is deleted; the input form is not mutated; and any parser error causes `nextForm` to remain the original form reference.

- [ ] **Step 2: Run merge tests and verify failure**

```powershell
cd D:\School_TimeTable_Generator\frontend
npm test -- --run src/pages/catalog/catalogImportMerge.test.js
```

Expected: FAIL because the merge module does not exist.

- [ ] **Step 3: Implement deterministic name-based merging**

Clone catalog arrays and nested teacher/fixed-slot arrays before modification. Build trimmed-name maps. Implement `ensureNamedEntity(collectionKey, prefix, name)` that prepends a created `{ id, name }`, records the ID in `created`, and increments the relevant summary count. Process teacher rows first, then requirement rows so an explicitly imported teacher is enriched rather than duplicated.

Use the existing `createId` implementation by default:

```js
import { createId } from "./catalogState";

export function planCatalogImport(form, parsed, options = {}) {
  const makeId = options.createId || createId;
  if (parsed.errors?.length) {
    return { nextForm: form, summary: emptySummary(parsed.skipped), errors: parsed.errors, created: emptyCreated() };
  }
  // clone, ensure entities, update teachers and requirements, then return one atomic result
}
```

When a matching requirement exists, preserve `id` and `consecutive_periods`; when creating it, set `consecutive_periods: 1`. Always copy imported fixed slots. Validate the final form with `validateCatalogForm(nextForm)` and convert any unexpected final validation failures into render-safe import errors with `fileType: "merge"` and no row rather than returning a partially valid draft.

- [ ] **Step 4: Extend parser result metadata**

Return `skipped` from both parser functions and keep row source metadata through the merge. Update parser tests so identical duplicate rows assert `skipped === 1`.

- [ ] **Step 5: Run parser and merge tests**

```powershell
npm test -- --run src/pages/catalog/excelCatalogImport.test.js src/pages/catalog/catalogImportMerge.test.js
```

Expected: all tests PASS.

- [ ] **Step 6: Commit merge planner and tests**

```powershell
git add frontend/src/pages/catalog/catalogImportMerge.js frontend/src/pages/catalog/catalogImportMerge.test.js frontend/src/pages/catalog/excelCatalogImport.js frontend/src/pages/catalog/excelCatalogImport.test.js
git commit -m "feat: plan atomic catalog imports"
```

---

### Task 3: Import dialog and preview interaction

**Files:**
- Create: `frontend/src/pages/catalog/CatalogImportDialog.jsx`
- Create: `frontend/src/pages/catalog/CatalogImportDialog.test.jsx`

**Interfaces:**
- Consumes `form`, `open`, and Task 1/2 functions.
- Produces `onApply({ nextForm, created })` only after a valid preview.
- Produces `onClose()` without changing form state.

- [ ] **Step 1: Write failing dialog tests**

Mock parser and planner modules. Render with `open={true}` and assert the dialog exposes two file inputs with accessible names “教师信息 Excel” and “课程要求 Excel”. Cover:

```jsx
fireEvent.change(screen.getByLabelText("教师信息 Excel"), {
  target: { files: [new File(["xlsx"], "教师.xlsx")] },
});
fireEvent.click(screen.getByRole("button", { name: "解析并预览" }));
expect(await screen.findByRole("button", { name: "解析中…" })).toBeDisabled();
await screen.findByText(/新增教师 1/);
fireEvent.click(screen.getByRole("button", { name: "应用到草稿" }));
expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ nextForm, created }));
```

Also assert: no selected files disables parsing; parser errors are rendered with formatted location strings; errors disable “应用到草稿”; cancel calls only `onClose`; applying calls `onApply` once; and a second click cannot start duplicate parsing while pending.

- [ ] **Step 2: Run dialog tests and verify failure**

```powershell
cd D:\School_TimeTable_Generator\frontend
npm test -- --run src/pages/catalog/CatalogImportDialog.test.jsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the accessible modal**

Use a fixed overlay with `role="dialog"`, `aria-modal="true"`, and a visible title. Keep selected files, `parsing`, preview, and local errors in component state. Read bytes with `await file.arrayBuffer()`, call only the selected parsers, combine their rows/errors/skipped values, then call `planCatalogImport(form, parsed)`. Use the existing `AsyncButton`:

```jsx
<AsyncButton
  onClick={handlePreview}
  loading={parsing}
  loadingLabel="解析中…"
  disabled={parsing || (!teacherFile && !requirementFile)}
>
  解析并预览
</AsyncButton>
```

Render counts separately for classes, subjects, rooms, teachers, and course requirements. Render every error through `formatImportError(error)`. Reset dialog-local state whenever `open` changes from false to true.

- [ ] **Step 4: Run dialog tests and verify pass**

Run the command from Step 2. Expected: all dialog tests PASS.

- [ ] **Step 5: Commit dialog and tests**

```powershell
git add frontend/src/pages/catalog/CatalogImportDialog.jsx frontend/src/pages/catalog/CatalogImportDialog.test.jsx
git commit -m "feat: preview Excel catalog imports"
```

---

### Task 4: Catalog page integration and hidden consecutive control

**Files:**
- Modify: `frontend/src/pages/catalog/CatalogPage.jsx`
- Modify: `frontend/src/pages/catalog/CatalogPage.test.jsx`

**Interfaces:**
- Consumes `CatalogImportDialog` from Task 3.
- Calls `setForm(nextForm)` only from the dialog `onApply` callback.
- Uses `markNewEntity` for the first created entity and existing `toast` messaging.

- [ ] **Step 1: Replace the old consecutive-field page test with failing expected behavior**

Update the existing test named “supports creating and configuring course requirements…” so it no longer queries or edits a consecutive input. Assert the control is absent and the saved newly created requirement has `consecutive_periods: 1`:

```js
expect(within(firstRequirementCard).queryByRole("spinbutton", { name: /连堂|连续节次/i }))
  .not.toBeInTheDocument();
// configure class, subject, teacher, room, periods and save
expect(api.updateCatalog).toHaveBeenCalledWith(expect.objectContaining({
  course_requirements: expect.arrayContaining([
    expect.objectContaining({ class_id: "c2", subject_id: "s2", consecutive_periods: 1 }),
  ]),
}));
```

Add a page test that opens the import dialog, applies a mocked `nextForm`, verifies the newly imported teacher/requirement appears first, then clicks save and verifies `api.updateCatalog` receives the imported draft. Add a test that canceling the dialog does not change the form.

- [ ] **Step 2: Run the catalog page test and verify failure**

```powershell
cd D:\School_TimeTable_Generator\frontend
npm test -- --run src/pages/catalog/CatalogPage.test.jsx
```

Expected: FAIL because the import button/dialog are absent and the consecutive control is still visible.

- [ ] **Step 3: Integrate the dialog and remove the visible consecutive editor**

Add `importOpen` state and an “导入 Excel” button beside “保存基础数据”. Render `CatalogImportDialog` with the current form. On apply:

```js
const handleApplyImport = ({ nextForm, created }) => {
  setForm(nextForm);
  setErrors([]);
  setImportOpen(false);
  const target = [
    ["teachers", created.teachers?.[0]],
    ["requirements", created.courseRequirements?.[0]],
    ["classes", created.classes?.[0]],
    ["subjects", created.subjects?.[0]],
    ["rooms", created.rooms?.[0]],
  ].find(([, id]) => id);
  if (target) markNewEntity({ tab: target[0], entityId: target[1], field: "name" });
  toast.success("Excel 数据已应用到草稿，请检查后保存");
};
```

Remove only the visible consecutive input block. Keep the existing value in form objects and `buildCatalogPayload`; new manual requirements already initialize `consecutive_periods: 1`.

- [ ] **Step 4: Run all catalog import tests**

```powershell
npm test -- --run src/pages/catalog/excelCatalogImport.test.js src/pages/catalog/catalogImportMerge.test.js src/pages/catalog/CatalogImportDialog.test.jsx src/pages/catalog/CatalogPage.test.jsx src/pages/catalog/catalogState.test.js
```

Expected: all tests PASS.

- [ ] **Step 5: Commit page integration**

```powershell
git add frontend/src/pages/catalog/CatalogPage.jsx frontend/src/pages/catalog/CatalogPage.test.jsx
git commit -m "feat: import Excel catalog data"
```

---

### Task 5: Regression verification

**Files:**
- Modify only files already listed if verification exposes a feature regression.

**Interfaces:**
- Validates the complete front-end artifact produced by Tasks 1–4.

- [ ] **Step 1: Run the full front-end test suite**

```powershell
cd D:\School_TimeTable_Generator\frontend
npm test -- --run
```

Expected: all test files PASS.

- [ ] **Step 2: Run lint**

```powershell
npm run lint
```

Expected: exit code 0 with no ESLint errors.

- [ ] **Step 3: Build the production front end**

```powershell
npm run build
```

Expected: Vite exits with code 0 and produces `frontend/dist`.

- [ ] **Step 4: Inspect the final diff and preserve unrelated work**

```powershell
cd D:\School_TimeTable_Generator
git diff --check
git status --short
git diff --stat HEAD~4..HEAD
```

Expected: no whitespace errors; feature commits contain only the planned docs and front-end import files. The pre-existing dirty files remain unstaged and unchanged by this feature.

- [ ] **Step 5: Commit any verification-only correction**

Only when Steps 1–3 required a correction:

```powershell
git add frontend/src/pages/catalog
git commit -m "fix: harden Excel catalog import"
```

