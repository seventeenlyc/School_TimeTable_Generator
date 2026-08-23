import ExcelJS from "exceljs";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import {
  formatImportError,
  parseRequirementWorkbook,
  parseTeacherWorkbook,
} from "./excelCatalogImport";

async function workbookBuffer(headers, rows, sheetName = "Sheet1") {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  if (headers) sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  return workbook.xlsx.writeBuffer();
}

async function workbookWithSheets(sheets) {
  const workbook = new ExcelJS.Workbook();
  sheets.forEach(({ name, headers, rows }) => {
    const sheet = workbook.addWorksheet(name);
    if (headers) sheet.addRow(headers);
    rows.forEach((row) => sheet.addRow(row));
  });
  return workbook.xlsx.writeBuffer();
}

async function workbookWithPrefixedSpreadsheetNamespace(headers, rows, sheetName = "Sheet1") {
  const buffer = await workbookBuffer(headers, rows, sheetName);
  const zip = await JSZip.loadAsync(buffer);
  const spreadsheetNamespace = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

  await Promise.all(Object.values(zip.files).map(async (entry) => {
    if (entry.dir || !entry.name.endsWith(".xml")) return;
    const xml = await entry.async("string");
    if (!xml.includes(`xmlns="${spreadsheetNamespace}"`)) return;
    const prefixed = xml
      .replace(`xmlns="${spreadsheetNamespace}"`, `xmlns:x="${spreadsheetNamespace}"`)
      .replace(/<(\/?)([A-Za-z_][\w.-]*)(?=[\s/>])/g, "<$1x:$2");
    zip.file(entry.name, prefixed);
  }));

  return zip.generateAsync({ type: "arraybuffer" });
}

describe("parseTeacherWorkbook", () => {
  it("parses SpreadsheetML files whose main namespace uses an x prefix", async () => {
    const buffer = await workbookWithPrefixedSpreadsheetNamespace(
      ["教师姓名", "班主任班级", "主教学科"],
      [["语文教师01", "1班", "语文"]],
      "教师",
    );

    const result = await parseTeacherWorkbook(buffer, "教师.xlsx");

    expect(result.errors).toEqual([]);
    expect(result.sheetName).toBe("教师");
    expect(result.rows).toEqual([
      expect.objectContaining({
        name: "语文教师01",
        homeroomClassName: "1班",
        mainSubjectName: "语文",
      }),
    ]);
  });

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

  it("validates a row that only has data in an extra worksheet column", async () => {
    const buffer = await workbookBuffer(
      ["教师姓名", "班主任班级", "主教学科", "备注"],
      [[null, null, null, "这不是空行"]],
    );

    const result = await parseTeacherWorkbook(buffer, "教师.xlsx");

    expect(result.rows).toEqual([]);
    expect(result.errors.map((error) => error.column)).toEqual([
      "教师姓名",
      "主教学科",
    ]);
    expect(result.errors.every((error) => error.row === 2)).toBe(true);
  });

  it("blocks Excel error cells instead of importing their object text", async () => {
    const buffer = await workbookBuffer(
      ["教师姓名", "班主任班级", "主教学科"],
      [[{ error: "#N/A" }, "1班", "语文"]],
    );

    const result = await parseTeacherWorkbook(buffer, "教师.xlsx");

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([
      expect.objectContaining({
        row: 2,
        column: "教师姓名",
        value: { error: "#N/A" },
        message: expect.stringContaining("非法"),
      }),
    ]);
  });

  it("uses the first non-empty worksheet and reports missing headers", async () => {
    const buffer = await workbookWithSheets([
      { name: "空白页", rows: [] },
      { name: "教师名单", headers: ["教师姓名", "班主任班级"], rows: [["小明", "1班"]] },
    ]);

    const result = await parseTeacherWorkbook(buffer, "教师.xlsx");

    expect(result.sheetName).toBe("教师名单");
    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([
      expect.objectContaining({
        fileType: "teacher",
        fileName: "教师.xlsx",
        sheetName: "教师名单",
        row: 1,
        column: "主教学科",
        message: expect.stringContaining("缺少必需列"),
      }),
    ]);
  });

  it("deduplicates identical teacher rows and reports every conflicting row", async () => {
    const buffer = await workbookBuffer(
      ["教师姓名", "班主任班级", "主教学科"],
      [
        ["小明", "1班", "语文"],
        [" 小明 ", "1班", "语文"],
        ["小明", "2班", "数学"],
      ],
    );

    const result = await parseTeacherWorkbook(buffer, "教师.xlsx");

    expect(result.skipped).toBe(0);
    expect(result.rows).toEqual([]);
    expect(result.errors).toHaveLength(3);
    expect(result.errors.map((error) => error.row)).toEqual([2, 3, 4]);
    expect(result.errors.every((error) => error.column === "教师姓名")).toBe(true);
  });

  it("reports every row in a conflicting duplicate group without counting duplicates as skipped", async () => {
    const buffer = await workbookBuffer(
      ["教师姓名", "班主任班级", "主教学科"],
      [
        ["小明", "1班", "语文"],
        ["小明", "1班", "语文"],
        ["小明", "2班", "数学"],
        ["小明", "2班", "数学"],
      ],
    );

    const result = await parseTeacherWorkbook(buffer, "教师.xlsx");

    expect(result.rows).toEqual([]);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(4);
    expect(result.errors.map((error) => error.row)).toEqual([2, 3, 4, 5]);
  });
});

describe("parseRequirementWorkbook", () => {
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

  it("rejects missing headers and invalid weekly periods", async () => {
    const buffer = await workbookBuffer(
      ["班级", "科目", "教师", "教室", "周课时", "连堂课时"],
      [["1班", "语文", "小明", "1班教室", 6]],
    );

    const result = await parseRequirementWorkbook(buffer, "课程要求.xlsx");

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([
      expect.objectContaining({ column: "固定时间（星期*节次）", row: 1 }),
    ]);
  });

  it("rejects non-positive and non-integer weekly periods", async () => {
    const buffer = await workbookBuffer(
      ["班级", "科目", "教师", "教室", "周课时", "连堂课时", "固定时间（星期*节次）"],
      [["1班", "语文", "小明", "1班教室", 0, "/"], ["1班", "数学", "小明", "1班教室", 1.5, "/"]],
    );

    const result = await parseRequirementWorkbook(buffer, "课程要求.xlsx");

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([
      expect.objectContaining({ row: 2, column: "周课时", value: 0, message: expect.stringContaining("正整数") }),
      expect.objectContaining({ row: 3, column: "周课时", value: 1.5, message: expect.stringContaining("正整数") }),
    ]);
  });

  it("rejects malformed fixed slots and slots outside the spreadsheet convention", async () => {
    const buffer = await workbookBuffer(
      ["班级", "科目", "教师", "教室", "周课时", "连堂课时", "固定时间（星期*节次）"],
      [
        ["1班", "语文", "小明", "1班教室", 1, 1, "1-8"],
        ["1班", "数学", "小明", "1班教室", 1, 1, "0*1"],
        ["1班", "英语", "小明", "1班教室", 1, 1, "1*21"],
      ],
    );

    const result = await parseRequirementWorkbook(buffer, "课程要求.xlsx");

    expect(result.rows).toEqual([]);
    expect(result.errors).toHaveLength(3);
    expect(result.errors.map((error) => error.row)).toEqual([2, 3, 4]);
    expect(result.errors.every((error) => error.column === "固定时间（星期*节次）")).toBe(true);
  });

  it("deduplicates identical requirements and reports every conflicting duplicate", async () => {
    const buffer = await workbookBuffer(
      ["班级", "科目", "教师", "教室", "周课时", "连堂课时", "固定时间（星期*节次）"],
      [
        ["1班", "语文", "小明", "1班教室", "6", 9, "1*1"],
        [" 1班 ", "语文", "小明", "1班教室", 6, 0, "1*1"],
        ["1班", "语文", "小红", "1班教室", 6, 0, "1*1"],
      ],
    );

    const result = await parseRequirementWorkbook(buffer, "课程要求.xlsx");

    expect(result.skipped).toBe(0);
    expect(result.rows).toEqual([]);
    expect(result.errors).toHaveLength(3);
    expect(result.errors.map((error) => error.row)).toEqual([2, 3, 4]);
    expect(result.errors.every((error) => error.column === "班级")).toBe(true);
  });
});

describe("formatImportError", () => {
  it("returns a render-safe Chinese string for structured errors", () => {
    const result = formatImportError({
      fileType: "teacher",
      fileName: "教师.xlsx",
      sheetName: "Sheet1",
      row: 2,
      column: "教师姓名",
      value: { unexpected: true },
      message: "名称不能为空",
    });

    expect(typeof result).toBe("string");
    expect(result).toContain("教师.xlsx");
    expect(result).toContain("Sheet1");
    expect(result).not.toContain("[object Object]");
  });
});
