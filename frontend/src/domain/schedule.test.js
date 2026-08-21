import { describe, it, expect } from "vitest";
import { buildScheduleIndexes, formatCell, applyCellMove } from "./schedule";

describe("schedule formatting and indexes", () => {
  const state = {
    classes: [
      { id: "class-1", name: "高一(1)班" },
      { id: "class-2", name: "高一(2)班" },
    ],
    teachers: [
      { id: "teacher-li", name: "李老师" },
      { id: "teacher-zhang", name: "张老师" },
      { id: "teacher-wang", name: "王老师" },
    ],
    rooms: [
      { id: "room-301", name: "301教室" },
      { id: "room-302", name: "302教室" },
    ],
    subjects: [
      { id: "subject-math", name: "数学" },
      { id: "subject-geography", name: "地理" },
      { id: "subject-politics", name: "政治" },
    ],
    course_requirements: [
      {
        id: "req-math",
        class_id: "class-1",
        subject_id: "subject-math",
        teacher_id: "teacher-li",
        periods_per_week: 5,
      },
    ],
    split_course_blocks: [
      {
        id: "split-geo-pol",
        source_class_ids: ["class-1", "class-2"],
        periods_per_week: 2,
        groups: [
          { id: "g1", subject_id: "subject-geography", teacher_id: "teacher-zhang", room_id: "room-301" },
          { id: "g2", subject_id: "subject-politics", teacher_id: "teacher-wang", room_id: "room-302" },
        ],
      },
    ],
  };

  const indexes = buildScheduleIndexes(state);

  it("formats normal lesson cell accurately", () => {
    const cell = { kind: "lesson", requirement_id: "req-math" };
    const formatted = formatCell(cell, indexes);

    expect(formatted).toEqual({
      title: "数学",
      subtitle: "李老师 · 高一(1)班",
      room: "",
      kind: "lesson",
      isSubstituted: false,
      substituteTeacherName: null,
    });
  });

  it("formats split cell displaying all group subjects, teachers and rooms", () => {
    const splitCell = { kind: "split", split_block_id: "split-geo-pol" };
    const formatted = formatCell(splitCell, indexes);

    expect(formatted).toEqual({
      title: "地理 / 政治",
      subtitle: "张老师 / 王老师",
      room: "301教室 / 302教室",
      kind: "split",
      splitBlockId: "split-geo-pol",
      sourceClassIds: ["class-1", "class-2"],
    });
  });

  it("applies split move synchronously across all source classes", () => {
    const classSchedules = {
      "class-1": [
        [{ kind: "split", split_block_id: "split-geo-pol" }, { kind: "empty" }],
      ],
      "class-2": [
        [{ kind: "split", split_block_id: "split-geo-pol" }, { kind: "empty" }],
      ],
    };

    const moved = applyCellMove(
      classSchedules,
      "class-1",
      { day: 0, period: 0 },
      { day: 0, period: 1 },
      indexes
    );

    expect(moved["class-1"][0][1].split_block_id).toBe("split-geo-pol");
    expect(moved["class-1"][0][0].kind).toBe("empty");
    // Class 2 must also have been synchronized
    expect(moved["class-2"][0][1].split_block_id).toBe("split-geo-pol");
    expect(moved["class-2"][0][0].kind).toBe("empty");
  });
});
