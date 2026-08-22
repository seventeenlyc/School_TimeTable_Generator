import { describe, expect, it } from "vitest";
import { buildCatalogErrorDetails } from "./catalogErrors";

describe("buildCatalogErrorDetails", () => {
  const form = {
    classes: [
      { id: "c1", name: "高一(1)班" },
      { id: "c2", name: "高一(2)班" },
    ],
    subjects: [{ id: "s1", name: "语文" }],
    teachers: [{ id: "t1", name: "张老师" }],
    course_requirements: [
      { id: "req1", class_id: "c1", subject_id: "s1", teacher_id: "t1" },
      { id: "req2", class_id: "c1", subject_id: "s1", teacher_id: "t1" },
    ],
    split_course_blocks: [],
    timetable_versions: [{ id: "version-1", name: "2026秋季课表" }],
  };

  it("resolves duplicate requirement targets and a human-readable catalog location", () => {
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
  });

  it("resolves timetable, weekday, teacher, and class names for teacher collisions", () => {
    const details = buildCatalogErrorDetails(
      {
        ...form,
        teachers: [{ id: "t1", name: "张老师" }],
        classes: [
          { id: "c1", name: "高一(1)班" },
          { id: "c2", name: "高一(2)班" },
        ],
      },
      [{
        code: "teacher_double_booked",
        entity_ids: ["version-1", "t1", "c1", "c2"],
        weekday: 2,
        period: 1,
        message: "教师在同一时间安排了多门课程",
      }]
    );

    expect(details[0].location).toContain("2026秋季课表");
    expect(details[0].location).toContain("周三第2节");
    expect(details[0].location).toContain("张老师");
    expect(details[0].location).toContain("高一(1)班");
    expect(details[0].location).toContain("高一(2)班");
  });

  it("resolves legacy string-only local messages and safely falls back for unknown messages", () => {
    const details = buildCatalogErrorDetails(form, [
      "课程要求 #2 引用的教师不存在",
      '教师 "张老师" 必须至少设置一个资质科目',
      "未知校验消息",
    ]);

    expect(details[0].targets).toEqual([{ tab: "requirements", entityId: "req2", field: "class_id" }]);
    expect(details[1].targets).toEqual([{ tab: "teachers", entityId: "t1", field: "name" }]);
    expect(details[2]).toMatchObject({ location: "基础数据", targets: [] });
  });

  it("resolves all matching requirements from a local duplicate message by names", () => {
    const details = buildCatalogErrorDetails(form, ["课程要求重复录入：高一(1)班 / 语文"]);

    expect(details[0].location).toBe("基础数据 → 课程要求 → 高一(1)班 / 语文");
    expect(details[0].targets).toEqual([
      { tab: "requirements", entityId: "req1", field: "teacher_id" },
      { tab: "requirements", entityId: "req2", field: "teacher_id" },
    ]);
  });

  it("resolves all matching requirements from a local different-teacher conflict message", () => {
    const details = buildCatalogErrorDetails({
      ...form,
      teachers: [
        { id: "t1", name: "张老师" },
        { id: "t2", name: "李老师" },
      ],
      course_requirements: [
        { id: "req1", class_id: "c1", subject_id: "s1", teacher_id: "t1" },
        { id: "req2", class_id: "c1", subject_id: "s1", teacher_id: "t2" },
      ],
    }, ["高一(1)班的语文配置了两个不同的任课教师：张老师、李老师"]);

    expect(details[0].location).toBe("基础数据 → 课程要求 → 高一(1)班 / 语文");
    expect(details[0].targets).toEqual([
      { tab: "requirements", entityId: "req1", field: "teacher_id" },
      { tab: "requirements", entityId: "req2", field: "teacher_id" },
    ]);
  });

  it("uses the split_blocks tab for split block targets", () => {
    const details = buildCatalogErrorDetails({
      ...form,
      split_course_blocks: [{ id: "block1", name: "文理走班" }],
    }, [{
      code: "unknown_split_block",
      entity_ids: ["block1"],
      message: "走班课程块配置无效",
    }]);

    expect(details[0].targets).toContainEqual({ tab: "split_blocks", entityId: "block1", field: "name" });
  });

  it("adds teacher and class context to room conflicts", () => {
    const details = buildCatalogErrorDetails({
      ...form,
      rooms: [{ id: "r1", name: "301教室" }],
      course_requirements: [
        { id: "req1", class_id: "c1", subject_id: "s1", teacher_id: "t1" },
        { id: "req2", class_id: "c2", subject_id: "s1", teacher_id: "t1" },
      ],
      timetable_versions: [{ id: "version-1", name: "2026秋季课表" }],
    }, [{
      code: "room_double_booked",
      entity_ids: ["version-1", "r1", "req1", "req2"],
      weekday: 2,
      period: 1,
      message: "教室同一时间被重复占用",
    }]);

    expect(details[0].location).toContain("2026秋季课表");
    expect(details[0].location).toContain("周三第2节");
    expect(details[0].location).toContain("张老师");
    expect(details[0].location).toContain("高一(1)班");
    expect(details[0].location).toContain("高一(2)班");
    expect(details[0].targets).toEqual(expect.arrayContaining([
      { tab: "rooms", entityId: "r1", field: "name" },
      { tab: "teachers", entityId: "t1", field: "name" },
      { tab: "classes", entityId: "c1", field: "name" },
      { tab: "classes", entityId: "c2", field: "name" },
    ]));
  });

  it("adds schedule context to teacher unavailable details", () => {
    const details = buildCatalogErrorDetails({
      ...form,
      timetable_versions: [{ id: "version-1", name: "2026秋季课表" }],
    }, [{
      code: "teacher_unavailable",
      entity_ids: ["version-1", "t1", "c1"],
      weekday: 2,
      period: 1,
      message: "教师不可用",
    }]);

    expect(details[0].location).toContain("2026秋季课表");
    expect(details[0].location).toContain("周三第2节");
    expect(details[0].location).toContain("张老师");
    expect(details[0].location).toContain("高一(1)班");
  });

  it("resolves split block IDs into source classes and group teachers", () => {
    const details = buildCatalogErrorDetails({
      ...form,
      teachers: [
        { id: "t1", name: "张老师" },
        { id: "t2", name: "李老师" },
      ],
      rooms: [{ id: "r1", name: "301教室" }],
      split_course_blocks: [{
        id: "block1",
        name: "文理走班",
        source_class_ids: ["c1", "c2"],
        groups: [
          { id: "g1", subject_id: "s1", teacher_id: "t1", room_id: "r1" },
          { id: "g2", subject_id: "s1", teacher_id: "t2", room_id: "r1" },
        ],
      }],
      timetable_versions: [{ id: "version-1", name: "2026秋季课表" }],
    }, [{
      code: "room_double_booked",
      entity_ids: ["version-1", "r1", "block1"],
      weekday: 2,
      period: 1,
      message: "教室同一时间被重复占用",
    }, {
      code: "room_double_booked",
      entity_ids: ["version-1", "r1", "g2"],
      weekday: 2,
      period: 1,
      message: "教室同一时间被重复占用",
    }]);

    expect(details[0].location).toContain("张老师");
    expect(details[0].location).toContain("李老师");
    expect(details[0].location).toContain("高一(1)班");
    expect(details[0].location).toContain("高一(2)班");
    expect(details[1].location).toContain("李老师");
    expect(details[1].location).not.toContain("张老师");
    expect(details[1].targets).toContainEqual({ tab: "split_blocks", entityId: "block1", field: "name" });
  });

  it("adds split group teacher and class targets to generic schedule context", () => {
    const details = buildCatalogErrorDetails({
      ...form,
      teachers: [
        { id: "t1", name: "张老师" },
        { id: "t2", name: "李老师" },
      ],
      split_course_blocks: [{
        id: "block1",
        name: "文理走班",
        source_class_ids: ["c1", "c2"],
        groups: [{ id: "g2", subject_id: "s1", teacher_id: "t2", room_id: "r1" }],
      }],
      timetable_versions: [{ id: "version-1", name: "2026秋季课表" }],
    }, [{
      code: "teacher_unavailable",
      entity_ids: ["version-1", "g2"],
      weekday: 2,
      period: 1,
      message: "教师不可用",
    }]);

    expect(details[0].location).toContain("李老师");
    expect(details[0].location).toContain("高一(1)班");
    expect(details[0].targets).toEqual(expect.arrayContaining([
      { tab: "teachers", entityId: "t2", field: "name" },
      { tab: "classes", entityId: "c1", field: "name" },
      { tab: "classes", entityId: "c2", field: "name" },
      { tab: "split_blocks", entityId: "block1", field: "name" },
    ]));
  });
});
