import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  buildClassTimetableWorkbook,
  makeExportFilename,
} from "./exportTimetable";

function makeFixture() {
  const state = {
    settings: { working_days: 5, periods_per_day: 2 },
    classes: [
      { id: "c1", name: "高一(1)班" },
      { id: "c2", name: "高一(2)班" },
    ],
    subjects: [
      { id: "chinese", name: "语文" },
      { id: "geography", name: "地理" },
      { id: "politics", name: "政治" },
    ],
    teachers: [
      { id: "t1", name: "张老师" },
      { id: "t2", name: "李老师" },
      { id: "t3", name: "王老师" },
    ],
    rooms: [
      { id: "r1", name: "101教室" },
      { id: "r2", name: "301教室" },
      { id: "r3", name: "302教室" },
    ],
    course_requirements: [
      {
        id: "req-chinese",
        class_id: "c1",
        subject_id: "chinese",
        teacher_id: "t1",
        room_id: "r1",
      },
    ],
    split_course_blocks: [
      {
        id: "split-geo-politics",
        source_class_ids: ["c1", "c2"],
        groups: [
          {
            id: "group-geography",
            subject_id: "geography",
            teacher_id: "t2",
            room_id: "r2",
          },
          {
            id: "group-politics",
            subject_id: "politics",
            teacher_id: "t3",
            room_id: "r3",
          },
        ],
      },
    ],
  };

  const emptyDay = () => [null, null];
  const classOne = Array.from({ length: 5 }, emptyDay);
  const classTwo = Array.from({ length: 5 }, emptyDay);
  classOne[0][0] = { kind: "lesson", requirement_id: "req-chinese" };
  classOne[1][0] = { kind: "split", split_block_id: "split-geo-politics" };
  classTwo[1][0] = { kind: "split", split_block_id: "split-geo-politics" };

  const version = {
    id: "version-1",
    name: "15班测试课表",
    effective_from: "2026-09-01",
    class_schedules: { c1: classOne, c2: classTwo },
  };

  return { state, version };
}

describe("class timetable Excel export", () => {
  it("serializes one worksheet per class with lesson, split lesson and self-study cells", async () => {
    const { state, version } = makeFixture();
    const workbook = buildClassTimetableWorkbook(state, version);
    const buffer = await workbook.xlsx.writeBuffer();

    const reopened = new ExcelJS.Workbook();
    await reopened.xlsx.load(buffer);

    expect(reopened.worksheets.map((sheet) => sheet.name)).toEqual([
      "高一(1)班",
      "高一(2)班",
    ]);

    const firstClass = reopened.getWorksheet("高一(1)班");
    expect(firstClass.getCell("A1").value).toBe("15班测试课表 - 高一(1)班");
    expect(firstClass.getCell("A2").value).toContain("2026-09-01");
    expect(firstClass.getCell("B4").value).toBe("语文\n张老师\n101教室");
    expect(firstClass.getCell("B5").value).toBe("自习");
    expect(firstClass.getCell("C4").value).toBe(
      "走班：地理 / 政治\n李老师 / 王老师\n301教室 / 302教室"
    );
    expect(firstClass.getCell("F3").value).toBe("周五");
    expect(firstClass.getCell("G3").value).toBeNull();
    expect(firstClass.views[0]).toMatchObject({ state: "frozen", ySplit: 3 });
    expect(firstClass.pageSetup).toMatchObject({
      orientation: "landscape",
      fitToWidth: 1,
    });
  });

  it("creates a Windows-safe workbook filename", () => {
    expect(makeExportFilename('高一:课表/秋季*?"<>|')).toBe(
      "高一_课表_秋季_______全部班级.xlsx"
    );
  });
});
