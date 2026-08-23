import { describe, expect, it } from "vitest";
import { planCatalogImport } from "./catalogImportMerge";

const source = {
  fileType: "requirement",
  fileName: "课程要求.xlsx",
  sheetName: "课程要求",
  row: 2,
};

function formWithExistingCatalog() {
  return {
    settings: {
      working_days: 6,
      periods_per_day: 8,
    },
    classes: [{ id: "class-1", name: "1班" }],
    subjects: [{ id: "subject-1", name: "语文" }],
    rooms: [{ id: "room-1", name: "101" }],
    teachers: [{
      id: "teacher-1",
      name: "张老师",
      qualified_subject_ids: ["subject-1"],
      homeroom_class_id: "class-1",
      main_subject_id: "subject-1",
      weekly_unavailable_slots: [{ weekday: 1, period: 2 }],
    }],
    course_requirements: [{
      id: "requirement-1",
      class_id: "class-1",
      subject_id: "subject-1",
      teacher_id: "teacher-1",
      room_id: "room-1",
      periods_per_week: 4,
      consecutive_periods: 3,
      fixed_slots: [],
    }],
    split_course_blocks: [],
  };
}

function deterministicCreateId() {
  let n = 0;
  return (prefix) => `${prefix}-${++n}`;
}

describe("planCatalogImport", () => {
  it("adds imported names and links a new requirement to their IDs", () => {
    const form = formWithExistingCatalog();
    const result = planCatalogImport(form, {
      teacherRows: [{
        name: "张老师",
        homeroomClassName: "2班",
        mainSubjectName: "数学",
        source,
      }],
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
    }, { createId: deterministicCreateId() });

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
    expect(result.summary.added).toEqual({
      classes: 1,
      subjects: 1,
      rooms: 1,
      teachers: 1,
      courseRequirements: 1,
    });
    expect(result.created.classes).toHaveLength(1);
    expect(result.created.subjects).toHaveLength(1);
    expect(result.created.rooms).toHaveLength(1);
    expect(result.created.teachers).toHaveLength(1);
    expect(result.created.courseRequirements).toHaveLength(1);
  });

  it("updates matching teachers without losing existing qualifications or unavailable slots", () => {
    const form = formWithExistingCatalog();
    const result = planCatalogImport(form, {
      teacherRows: [{
        name: "张老师",
        homeroomClassName: "2班",
        mainSubjectName: "数学",
        source,
      }],
      requirementRows: [],
      skipped: 0,
    }, { createId: deterministicCreateId() });

    const teacher = result.nextForm.teachers.find((item) => item.name === "张老师");
    expect(teacher.homeroom_class_id).toBe(result.nextForm.classes[0].id);
    expect(teacher.main_subject_id).toBe(result.nextForm.subjects[0].id);
    expect(teacher.qualified_subject_ids).toEqual(expect.arrayContaining([
      "subject-1",
      result.nextForm.subjects[0].id,
    ]));
    expect(teacher.weekly_unavailable_slots).toEqual([{ weekday: 1, period: 2 }]);
    expect(result.summary.updated.teachers).toBe(1);
  });

  it("does not clear an existing homeroom when the imported homeroom is blank", () => {
    const form = formWithExistingCatalog();
    const result = planCatalogImport(form, {
      teacherRows: [{
        name: "张老师",
        homeroomClassName: "",
        mainSubjectName: "语文",
        source,
      }],
      requirementRows: [],
      skipped: 0,
    });

    expect(result.errors).toEqual([]);
    expect(result.nextForm.teachers[0].homeroom_class_id).toBe("class-1");
  });

  it("updates an existing requirement by class and subject while preserving its ID and consecutive periods", () => {
    const form = formWithExistingCatalog();
    const result = planCatalogImport(form, {
      teacherRows: [],
      requirementRows: [{
        className: "1班",
        subjectName: "语文",
        teacherName: "李老师",
        roomName: "202",
        periodsPerWeek: 6,
        fixedSlots: [],
        source,
      }],
      skipped: 0,
    }, { createId: deterministicCreateId() });

    const requirement = result.nextForm.course_requirements[0];
    expect(requirement).toMatchObject({
      id: "requirement-1",
      periods_per_week: 6,
      consecutive_periods: 3,
      fixed_slots: [],
    });
    expect(result.nextForm.teachers.find((item) => item.name === "李老师")).toBeTruthy();
    expect(result.nextForm.rooms.find((item) => item.name === "202")).toBeTruthy();
    expect(result.summary.updated.courseRequirements).toBe(1);
  });

  it("updates an existing requirement's teacher, room, weekly periods, and fixed slots", () => {
    const form = formWithExistingCatalog();
    form.course_requirements[0].consecutive_periods = 1;
    const result = planCatalogImport(form, {
      teacherRows: [],
      requirementRows: [{
        className: "1班",
        subjectName: "语文",
        teacherName: "李老师",
        roomName: "202",
        periodsPerWeek: 6,
        fixedSlots: [{ weekday: 0, period: 7 }],
        source,
      }],
      skipped: 0,
    }, { createId: deterministicCreateId() });

    expect(result.errors).toEqual([]);
    expect(result.nextForm.course_requirements[0]).toMatchObject({
      id: "requirement-1",
      teacher_id: result.nextForm.teachers.find((item) => item.name === "李老师").id,
      room_id: result.nextForm.rooms.find((item) => item.name === "202").id,
      periods_per_week: 6,
      consecutive_periods: 1,
      fixed_slots: [{ weekday: 0, period: 7 }],
    });
  });

  it("counts one updated teacher once when multiple requirements add qualifications", () => {
    const form = formWithExistingCatalog();
    const result = planCatalogImport(form, {
      teacherRows: [],
      requirementRows: [
        {
          className: "1班",
          subjectName: "数学",
          teacherName: "张老师",
          roomName: "101",
          periodsPerWeek: 2,
          fixedSlots: [],
          source: { ...source, row: 2 },
        },
        {
          className: "1班",
          subjectName: "英语",
          teacherName: "张老师",
          roomName: "101",
          periodsPerWeek: 2,
          fixedSlots: [],
          source: { ...source, row: 3 },
        },
      ],
      skipped: 0,
    }, {
      createId: (() => {
        let n = 0;
        return (prefix) => `${prefix}-new-${++n}`;
      })(),
    });

    expect(result.errors).toEqual([]);
    expect(result.summary.updated.teachers).toBe(1);
  });

  it("does not delete existing catalog entities and does not mutate the input form", () => {
    const form = formWithExistingCatalog();
    const original = structuredClone(form);
    const result = planCatalogImport(form, {
      teacherRows: [{
        name: "新教师",
        homeroomClassName: "2班",
        mainSubjectName: "数学",
        source,
      }],
      requirementRows: [],
      skipped: 0,
    }, { createId: deterministicCreateId() });

    expect(form).toEqual(original);
    expect(result.nextForm.classes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "class-1", name: "1班" }),
      expect.objectContaining({ name: "2班" }),
    ]));
    expect(result.nextForm.subjects).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "subject-1", name: "语文" }),
      expect.objectContaining({ name: "数学" }),
    ]));
    expect(result.nextForm.rooms).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "room-1", name: "101" }),
    ]));
    expect(result.nextForm.teachers).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "teacher-1", name: "张老师" }),
    ]));
    expect(result.nextForm.course_requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "requirement-1" }),
    ]));
  });

  it("returns the original form reference when parser errors are present", () => {
    const form = formWithExistingCatalog();
    const parserError = {
      fileType: "teacher",
      fileName: "教师.xlsx",
      sheetName: "Sheet1",
      row: 2,
      column: "教师姓名",
      value: null,
      message: "教师姓名不能为空",
    };

    const result = planCatalogImport(form, {
      teacherRows: [],
      requirementRows: [],
      skipped: 2,
      errors: [parserError],
    });

    expect(result.nextForm).toBe(form);
    expect(result.errors).toEqual([parserError]);
    expect(result.summary.skipped).toBe(2);
    expect(result.created).toEqual({
      classes: [],
      subjects: [],
      rooms: [],
      teachers: [],
      courseRequirements: [],
    });
  });

  it("preserves the imported row source when final validation fails", () => {
    const form = formWithExistingCatalog();
    const result = planCatalogImport(form, {
      teacherRows: [],
      requirementRows: [{
        className: "1班",
        subjectName: "语文",
        teacherName: "张老师",
        roomName: "101",
        periodsPerWeek: 7,
        fixedSlots: [
          { weekday: 0, period: 0 },
          { weekday: 0, period: 0 },
        ],
        source,
      }],
      skipped: 0,
    });

    expect(result.nextForm).toBe(form);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        fileType: "requirement",
        fileName: "课程要求.xlsx",
        sheetName: "课程要求",
        row: 2,
        column: "固定时间（星期*节次）",
      }),
    ]));
    expect(result.errors.every((error) => typeof error.message === "string")).toBe(true);
  });
});
