import { describe, it, expect } from "vitest";
import { buildCatalogPayload, catalogFromState, validateCatalogForm } from "./catalogState";

describe("catalogState - buildCatalogPayload", () => {
  it("stabilizes entity IDs and preserves snake_case fields", () => {
    const form = {
      classes: [{ id: "c1", name: "高一(1)班" }],
      teachers: [
        {
          id: "t1",
          name: "张老师",
          qualified_subject_ids: ["sub_geo"],
          homeroom_class_id: "c1",
          main_subject_id: "sub_geo",
          weekly_unavailable_slots: [{ weekday: 1, period: 1 }],
        },
      ],
      rooms: [{ id: "r1", name: "301教室" }],
      subjects: [{ id: "sub_geo", name: "地理" }],
      course_requirements: [],
      split_course_blocks: [],
    };

    const payload = buildCatalogPayload(form, 3);

    expect(payload.base_revision).toBe(3);
    expect(payload.classes[0].id).toBe("c1");
    expect(payload.classes[0].name).toBe("高一(1)班");
    expect(payload.teachers[0].id).toBe("t1");
    expect(payload.teachers[0].name).toBe("张老师");
    expect(payload.teachers[0].qualified_subject_ids).toEqual(["sub_geo"]);
    expect(payload.teachers[0].homeroom_class_id).toBe("c1");
    expect(payload.teachers[0].main_subject_id).toBe("sub_geo");
  });

  it("automatically rebuilds teaching_assignment_ids for each teacher based on course_requirements teacher_id", () => {
    const form = {
      classes: [
        { id: "c1", name: "高一(1)班" },
        { id: "c2", name: "高一(2)班" },
      ],
      teachers: [
        { id: "t1", name: "张老师", qualified_subject_ids: ["sub_geo"] },
        { id: "t2", name: "王老师", qualified_subject_ids: ["sub_pol"] },
      ],
      rooms: [],
      subjects: [
        { id: "sub_geo", name: "地理" },
        { id: "sub_pol", name: "政治" },
      ],
      course_requirements: [
        {
          id: "cr_1",
          class_id: "c1",
          subject_id: "sub_geo",
          teacher_id: "t1",
          periods_per_week: 2,
        },
        {
          id: "cr_2",
          class_id: "c2",
          subject_id: "sub_geo",
          teacher_id: "t1",
          periods_per_week: 2,
        },
        {
          id: "cr_3",
          class_id: "c1",
          subject_id: "sub_pol",
          teacher_id: "t2",
          periods_per_week: 2,
        },
      ],
      split_course_blocks: [],
    };

    const payload = buildCatalogPayload(form, 1);

    const t1 = payload.teachers.find((t) => t.id === "t1");
    const t2 = payload.teachers.find((t) => t.id === "t2");

    expect(t1.teaching_assignment_ids).toEqual(["cr_1", "cr_2"]);
    expect(t2.teaching_assignment_ids).toEqual(["cr_3"]);
  });

  it("uses weekly_unavailable_slots and does not send legacy unavailable_slots", () => {
    const form = {
      classes: [],
      teachers: [
        {
          id: "t1",
          name: "张老师",
          qualified_subject_ids: ["sub_geo"],
          weekly_unavailable_slots: [{ weekday: 1, period: 1 }],
          unavailable_slots: [{ weekday: 1, period: 1 }], // legacy field
        },
      ],
      rooms: [],
      subjects: [{ id: "sub_geo", name: "地理" }],
      course_requirements: [],
      split_course_blocks: [],
    };

    const payload = buildCatalogPayload(form, 1);

    expect(payload.teachers[0].weekly_unavailable_slots).toEqual([{ weekday: 1, period: 1 }]);
    expect(payload.teachers[0].unavailable_slots).toBeUndefined();
  });

  it("deep-clones course_requirement.fixed_slots and buildCatalogPayload preserves normalized slots", () => {
    const rawCourseReq = {
      id: "req1",
      class_id: "c1",
      subject_id: "sub_geo",
      teacher_id: "t1",
      periods_per_week: 3,
      consecutive_periods: 1,
      fixed_slots: [{ weekday: 0, period: 7 }],
    };

    const initial = {
      classes: [{ id: "c1", name: "高一(1)班" }],
      teachers: [{ id: "t1", name: "张老师", qualified_subject_ids: ["sub_geo"] }],
      rooms: [],
      subjects: [{ id: "sub_geo", name: "地理" }],
      course_requirements: [rawCourseReq],
      split_course_blocks: [],
    };

    const form = catalogFromState(initial);
    // Verify deep clone
    expect(form.course_requirements[0].fixed_slots).toEqual([{ weekday: 0, period: 7 }]);
    expect(form.course_requirements[0].fixed_slots).not.toBe(rawCourseReq.fixed_slots);
    form.course_requirements[0].fixed_slots.push({ weekday: 1, period: 2 });
    expect(rawCourseReq.fixed_slots).toHaveLength(1);

    // Verify buildCatalogPayload preserves normalized fixed_slots
    const payload = buildCatalogPayload(form, 1);
    expect(payload.course_requirements[0].fixed_slots).toEqual([
      { weekday: 0, period: 7 },
      { weekday: 1, period: 2 },
    ]);
  });

  it("completely retains split course block name, source_class_ids, periods_per_week, and groups", () => {
    // Effective Geo/Pol split block: 1班 + 2班, 地理/张老师/301, 政治/王老师/302
    const form = {
      classes: [
        { id: "c1", name: "高一(1)班" },
        { id: "c2", name: "高一(2)班" },
      ],
      teachers: [
        { id: "t1", name: "张老师", qualified_subject_ids: ["sub_geo"] },
        { id: "t2", name: "王老师", qualified_subject_ids: ["sub_pol"] },
      ],
      rooms: [
        { id: "r1", name: "301教室" },
        { id: "r2", name: "302教室" },
      ],
      subjects: [
        { id: "sub_geo", name: "地理" },
        { id: "sub_pol", name: "政治" },
      ],
      course_requirements: [],
      split_course_blocks: [
        {
          id: "sp_1",
          name: "高一地理政治走班",
          source_class_ids: ["c1", "c2"],
          periods_per_week: 3,
          groups: [
            { id: "g1", subject_id: "sub_geo", teacher_id: "t1", room_id: "r1" },
            { id: "g2", subject_id: "sub_pol", teacher_id: "t2", room_id: "r2" },
          ],
        },
      ],
    };

    const payload = buildCatalogPayload(form, 1);

    expect(payload.split_course_blocks).toHaveLength(1);
    const block = payload.split_course_blocks[0];
    expect(block.id).toBe("sp_1");
    expect(block.name).toBe("高一地理政治走班");
    expect(block.source_class_ids).toEqual(["c1", "c2"]);
    expect(block.periods_per_week).toBe(3);
    expect(block.groups).toEqual([
      { id: "g1", subject_id: "sub_geo", teacher_id: "t1", room_id: "r1" },
      { id: "g2", subject_id: "sub_pol", teacher_id: "t2", room_id: "r2" },
    ]);
  });
});

describe("catalogState - composite course requirement duplicates", () => {
  const baseForm = {
    settings: { working_days: 6, periods_per_day: 8 },
    classes: [{ id: "c1", name: "高一(1)班" }],
    subjects: [{ id: "s1", name: "语文" }],
    rooms: [],
    teachers: [
      { id: "t1", name: "张老师", qualified_subject_ids: ["s1"] },
      { id: "t2", name: "李老师", qualified_subject_ids: ["s1"] },
    ],
    course_requirements: [],
    split_course_blocks: [],
  };

  it("reports duplicate requirements when class, subject, and teacher are the same", () => {
    const sameTeacherForm = {
      ...baseForm,
      course_requirements: [
        { id: "req1", class_id: "c1", subject_id: "s1", teacher_id: "t1", periods_per_week: 2 },
        { id: "req2", class_id: "c1", subject_id: "s1", teacher_id: "t1", periods_per_week: 2 },
      ],
    };

    expect(validateCatalogForm(sameTeacherForm)).toContain(
      "课程要求重复录入：高一(1)班 / 语文"
    );
  });

  it("reports a teacher conflict when duplicate class and subject use different teachers", () => {
    const differentTeacherForm = {
      ...baseForm,
      course_requirements: [
        { id: "req1", class_id: "c1", subject_id: "s1", teacher_id: "t1", periods_per_week: 2 },
        { id: "req2", class_id: "c1", subject_id: "s1", teacher_id: "t2", periods_per_week: 2 },
      ],
    };

    expect(validateCatalogForm(differentTeacherForm)).toContain(
      "高一(1)班的语文配置了两个不同的任课教师：张老师、李老师"
    );
  });
});

describe("catalogState - split block identity", () => {
  it("assigns an ID to a split block that arrives without one", () => {
    const form = catalogFromState({
      split_course_blocks: [{ name: "文理走班", source_class_ids: [], groups: [] }],
    });

    expect(form.split_course_blocks[0].id).toMatch(/^split_/);
  });
});

describe("catalogState - validateCatalogForm", () => {
  const validBaseForm = {
    settings: {
      working_days: 5,
      periods_per_day: 8,
    },
    classes: [
      { id: "c1", name: "高一(1)班" },
      { id: "c2", name: "高一(2)班" },
    ],
    teachers: [
      { id: "t1", name: "张老师", qualified_subject_ids: ["sub_geo"] },
      { id: "t2", name: "王老师", qualified_subject_ids: ["sub_pol"] },
    ],
    rooms: [
      { id: "r1", name: "301教室" },
      { id: "r2", name: "302教室" },
    ],
    subjects: [
      { id: "sub_geo", name: "地理" },
      { id: "sub_pol", name: "政治" },
    ],
    course_requirements: [
      {
        id: "cr_1",
        class_id: "c1",
        subject_id: "sub_geo",
        teacher_id: "t1",
        periods_per_week: 2,
        consecutive_periods: 1,
      },
    ],
    split_course_blocks: [
      {
        id: "sp_1",
        name: "高一地理政治走班",
        source_class_ids: ["c1", "c2"],
        periods_per_week: 3,
        groups: [
          { id: "g1", subject_id: "sub_geo", teacher_id: "t1", room_id: "r1" },
          { id: "g2", subject_id: "sub_pol", teacher_id: "t2", room_id: "r2" },
        ],
      },
    ],
  };

  it("passes validation for a valid catalog form including a geo/pol split block", () => {
    const errors = validateCatalogForm(validBaseForm);
    expect(errors).toEqual([]);
  });

  it("reports error when a subject referenced by standard course requirement or split group is missing/deleted", () => {
    // Reference non-existent subject in course requirement
    const formReqDeleted = {
      ...validBaseForm,
      course_requirements: [
        {
          id: "cr_1",
          class_id: "c1",
          subject_id: "sub_deleted",
          teacher_id: "t1",
          periods_per_week: 2,
        },
      ],
      split_course_blocks: [],
    };
    const errors1 = validateCatalogForm(formReqDeleted);
    expect(errors1.length).toBeGreaterThan(0);
    expect(errors1.some((e) => e.includes("科目") || e.includes("sub_deleted"))).toBe(true);

    // Reference non-existent subject in split group
    const formSplitDeleted = {
      ...validBaseForm,
      course_requirements: [],
      split_course_blocks: [
        {
          id: "sp_1",
          name: "走班",
          source_class_ids: ["c1", "c2"],
          periods_per_week: 2,
          groups: [
            { id: "g1", subject_id: "sub_geo", teacher_id: "t1", room_id: "r1" },
            { id: "g2", subject_id: "sub_deleted", teacher_id: "t2", room_id: "r2" },
          ],
        },
      ],
    };
    const errors2 = validateCatalogForm(formSplitDeleted);
    expect(errors2.length).toBeGreaterThan(0);
    expect(errors2.some((e) => e.includes("科目") || e.includes("sub_deleted"))).toBe(true);
  });

  it("reports error when a teacher has no qualified subjects", () => {
    const form = {
      ...validBaseForm,
      teachers: [
        { id: "t1", name: "张老师", qualified_subject_ids: [] },
        { id: "t2", name: "王老师", qualified_subject_ids: ["sub_pol"] },
      ],
    };
    const errors = validateCatalogForm(form);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("资质") || e.includes("张老师"))).toBe(true);
  });

  it("reports error when a teacher of a standard course does not have the qualification for that subject", () => {
    const form = {
      ...validBaseForm,
      course_requirements: [
        {
          id: "cr_1",
          class_id: "c1",
          subject_id: "sub_pol", // Wang's subject, but assigned to Zhang who only has sub_geo
          teacher_id: "t1",
          periods_per_week: 2,
          consecutive_periods: 1,
        },
      ],
    };
    const errors = validateCatalogForm(form);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("资质") || e.includes("张老师") || e.includes("政治"))).toBe(true);
  });

  it("reports error when periods_per_week exceeds settings.working_days * settings.periods_per_day", () => {
    const form = {
      ...validBaseForm,
      settings: {
        working_days: 5,
        periods_per_day: 8, // max 40
      },
      course_requirements: [
        {
          id: "cr_1",
          class_id: "c1",
          subject_id: "sub_geo",
          teacher_id: "t1",
          periods_per_week: 41,
          consecutive_periods: 1,
        },
      ],
    };
    const errors = validateCatalogForm(form);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("周课时") || e.includes("41") || e.includes("超过"))).toBe(true);
  });

  it("reports error when consecutive_periods is greater than periods_per_week or periods_per_day", () => {
    // consecutive_periods > periods_per_week
    const form1 = {
      ...validBaseForm,
      course_requirements: [
        {
          id: "cr_1",
          class_id: "c1",
          subject_id: "sub_geo",
          teacher_id: "t1",
          periods_per_week: 2,
          consecutive_periods: 3,
        },
      ],
    };
    const errors1 = validateCatalogForm(form1);
    expect(errors1.length).toBeGreaterThan(0);
    expect(errors1.some((e) => e.includes("连节") || e.includes("周课时"))).toBe(true);

    // consecutive_periods > periods_per_day (8)
    const form2 = {
      ...validBaseForm,
      course_requirements: [
        {
          id: "cr_1",
          class_id: "c1",
          subject_id: "sub_geo",
          teacher_id: "t1",
          periods_per_week: 10,
          consecutive_periods: 9,
        },
      ],
    };
    const errors2 = validateCatalogForm(form2);
    expect(errors2.length).toBeGreaterThan(0);
    expect(errors2.some((e) => e.includes("连节") || e.includes("日课时") || e.includes("8"))).toBe(true);
  });

  describe("split course block validation rules", () => {
    it("reports error when split block name is missing or empty", () => {
      const form = {
        ...validBaseForm,
        split_course_blocks: [
          {
            id: "sp_1",
            name: "",
            source_class_ids: ["c1", "c2"],
            periods_per_week: 3,
            groups: [
              { id: "g1", subject_id: "sub_geo", teacher_id: "t1", room_id: "r1" },
              { id: "g2", subject_id: "sub_pol", teacher_id: "t2", room_id: "r2" },
            ],
          },
        ],
      };
      const errors = validateCatalogForm(form);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("名称") || e.includes("name"))).toBe(true);
    });

    it("reports error when split block has fewer than 2 source classes", () => {
      const form = {
        ...validBaseForm,
        split_course_blocks: [
          {
            id: "sp_1",
            name: "走班",
            source_class_ids: ["c1"],
            periods_per_week: 3,
            groups: [
              { id: "g1", subject_id: "sub_geo", teacher_id: "t1", room_id: "r1" },
              { id: "g2", subject_id: "sub_pol", teacher_id: "t2", room_id: "r2" },
            ],
          },
        ],
      };
      const errors = validateCatalogForm(form);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("2 个来源班级") || e.includes("来源班级"))).toBe(true);
    });

    it("reports error when split block has duplicate source classes", () => {
      const form = {
        ...validBaseForm,
        split_course_blocks: [
          {
            id: "sp_1",
            name: "走班",
            source_class_ids: ["c1", "c1"],
            periods_per_week: 3,
            groups: [
              { id: "g1", subject_id: "sub_geo", teacher_id: "t1", room_id: "r1" },
              { id: "g2", subject_id: "sub_pol", teacher_id: "t2", room_id: "r2" },
            ],
          },
        ],
      };
      const errors = validateCatalogForm(form);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("重复") && (e.includes("来源班") || e.includes("班级")))).toBe(true);
    });

    it("reports error when split block has fewer than 2 groups", () => {
      const form = {
        ...validBaseForm,
        split_course_blocks: [
          {
            id: "sp_1",
            name: "走班",
            source_class_ids: ["c1", "c2"],
            periods_per_week: 3,
            groups: [{ id: "g1", subject_id: "sub_geo", teacher_id: "t1", room_id: "r1" }],
          },
        ],
      };
      const errors = validateCatalogForm(form);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("2 个分组") || e.includes("分组"))).toBe(true);
    });

    it("reports error when group fields are incomplete (missing subject, teacher, or room)", () => {
      const form = {
        ...validBaseForm,
        split_course_blocks: [
          {
            id: "sp_1",
            name: "走班",
            source_class_ids: ["c1", "c2"],
            periods_per_week: 3,
            groups: [
              { id: "g1", subject_id: "", teacher_id: "t1", room_id: "r1" },
              { id: "g2", subject_id: "sub_pol", teacher_id: "t2", room_id: "" },
            ],
          },
        ],
      };
      const errors = validateCatalogForm(form);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("分组") || e.includes("完整") || e.includes("科目") || e.includes("教室"))).toBe(true);
    });

    it("reports error when split groups have duplicate subjects, teachers, or rooms", () => {
      // Duplicate teacher
      const formDupTeacher = {
        ...validBaseForm,
        split_course_blocks: [
          {
            id: "sp_1",
            name: "走班",
            source_class_ids: ["c1", "c2"],
            periods_per_week: 3,
            groups: [
              { id: "g1", subject_id: "sub_geo", teacher_id: "t1", room_id: "r1" },
              { id: "g2", subject_id: "sub_pol", teacher_id: "t1", room_id: "r2" },
            ],
          },
        ],
      };
      const errorsTeacher = validateCatalogForm(formDupTeacher);
      expect(errorsTeacher.length).toBeGreaterThan(0);
      expect(errorsTeacher.some((e) => e.includes("教师") && e.includes("重复"))).toBe(true);

      // Duplicate room
      const formDupRoom = {
        ...validBaseForm,
        split_course_blocks: [
          {
            id: "sp_1",
            name: "走班",
            source_class_ids: ["c1", "c2"],
            periods_per_week: 3,
            groups: [
              { id: "g1", subject_id: "sub_geo", teacher_id: "t1", room_id: "r1" },
              { id: "g2", subject_id: "sub_pol", teacher_id: "t2", room_id: "r1" },
            ],
          },
        ],
      };
      const errorsRoom = validateCatalogForm(formDupRoom);
      expect(errorsRoom.length).toBeGreaterThan(0);
      expect(errorsRoom.some((e) => e.includes("教室") && e.includes("重复"))).toBe(true);

      // Duplicate subject
      const formDupSubject = {
        ...validBaseForm,
        split_course_blocks: [
          {
            id: "sp_1",
            name: "走班",
            source_class_ids: ["c1", "c2"],
            periods_per_week: 3,
            groups: [
              { id: "g1", subject_id: "sub_geo", teacher_id: "t1", room_id: "r1" },
              { id: "g2", subject_id: "sub_geo", teacher_id: "t2", room_id: "r2" },
            ],
          },
        ],
      };
      const errorsSubj = validateCatalogForm(formDupSubject);
      expect(errorsSubj.length).toBeGreaterThan(0);
      expect(errorsSubj.some((e) => e.includes("科目") && e.includes("重复"))).toBe(true);
    });

    it("rejects fixed slots with duplicates, weekday/period out of bounds, count exceeding periods_per_week, or consecutive_periods != 1", () => {
      const settings = {
        working_days: 6,
        periods_per_day: 8,
      };

      const baseReq = {
        id: "req1",
        class_id: "c1",
        subject_id: "sub_geo",
        teacher_id: "t1",
        periods_per_week: 2,
        consecutive_periods: 1,
        fixed_slots: [],
      };

      // Duplicate slots
      const formDuplicate = {
        ...validBaseForm,
        course_requirements: [
          {
            ...baseReq,
            fixed_slots: [
              { weekday: 0, period: 1 },
              { weekday: 0, period: 1 },
            ],
          },
        ],
      };
      const errorsDup = validateCatalogForm(formDuplicate, settings);
      expect(errorsDup.some((e) => e.includes("固定时间") && e.includes("重复"))).toBe(true);

      // Weekday / period out of bounds (weekday >= 6 or < 0, period >= 8 or < 0)
      const formOutOfBoundsWeekday = {
        ...validBaseForm,
        course_requirements: [
          {
            ...baseReq,
            fixed_slots: [{ weekday: 6, period: 1 }],
          },
        ],
      };
      const errorsOobW = validateCatalogForm(formOutOfBoundsWeekday, settings);
      expect(errorsOobW.some((e) => e.includes("固定时间") || e.includes("范围") || e.includes("星期"))).toBe(true);

      const formOutOfBoundsPeriod = {
        ...validBaseForm,
        course_requirements: [
          {
            ...baseReq,
            fixed_slots: [{ weekday: 0, period: 8 }],
          },
        ],
      };
      const errorsOobP = validateCatalogForm(formOutOfBoundsPeriod, settings);
      expect(errorsOobP.some((e) => e.includes("固定时间") || e.includes("范围") || e.includes("节次"))).toBe(true);

      // Slots count > periods_per_week
      const formCountExceeded = {
        ...validBaseForm,
        course_requirements: [
          {
            ...baseReq,
            periods_per_week: 2,
            fixed_slots: [
              { weekday: 0, period: 0 },
              { weekday: 0, period: 1 },
              { weekday: 0, period: 2 },
            ],
          },
        ],
      };
      const errorsCount = validateCatalogForm(formCountExceeded, settings);
      expect(errorsCount.some((e) => e.includes("固定时间") && (e.includes("周课时") || e.includes("数量") || e.includes("超过")))).toBe(true);

      // Fixed slots with consecutive_periods != 1
      const formConsecutiveMismatch = {
        ...validBaseForm,
        course_requirements: [
          {
            ...baseReq,
            periods_per_week: 4,
            consecutive_periods: 2,
            fixed_slots: [{ weekday: 0, period: 0 }],
          },
        ],
      };
      const errorsConsecutive = validateCatalogForm(formConsecutiveMismatch, settings);
      expect(errorsConsecutive.some((e) => e.includes("固定时间") && (e.includes("连堂") || e.includes("连续节次") || e.includes("单节")))).toBe(true);
    });
  });
});
