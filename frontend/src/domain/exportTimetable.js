import ExcelJS from "exceljs";
import { buildScheduleIndexes } from "./schedule.js";

const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五"];
const INVALID_SHEET_CHARS = /[\\/*?:[\]]/g;
const INVALID_FILENAME_CHARS = /[<>:"/\\|?*]/g;
const BORDER_COLOR = "FFCBD5E1";
const HEADER_FILL = "FF0F766E";
const TITLE_FILL = "FF0F172A";
const META_FILL = "FFE2E8F0";
const SELF_STUDY_FILL = "FFF8FAFC";
const COURSE_COLORS = [
  "FFDBEAFE",
  "FFD1FAE5",
  "FFFEF3C7",
  "FFFCE7F3",
  "FFEDE9FE",
  "FFCFFAFE",
  "FFFFEDD5",
  "FFF1F5F9",
];

function hashText(value) {
  let hash = 0;
  for (const character of String(value || "")) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function courseFill(value) {
  return COURSE_COLORS[hashText(value) % COURSE_COLORS.length];
}

function cleanSheetName(value) {
  const cleaned = String(value || "班级课表")
    .replace(INVALID_SHEET_CHARS, "_")
    .replace(/^'+|'+$/g, "")
    .trim();
  return (cleaned || "班级课表").slice(0, 31);
}

function uniqueSheetName(value, usedNames) {
  const base = cleanSheetName(value);
  let candidate = base;
  let suffix = 2;

  while (usedNames.has(candidate.toLocaleLowerCase())) {
    const marker = ` (${suffix})`;
    candidate = `${base.slice(0, 31 - marker.length)}${marker}`;
    suffix += 1;
  }

  usedNames.add(candidate.toLocaleLowerCase());
  return candidate;
}

function formatClassCell(cell, indexes) {
  if (!cell || cell.kind === "empty") {
    return { text: "自习", kind: "empty", colorKey: "empty" };
  }

  if (cell.kind === "lesson") {
    const requirement = indexes.requirementsById.get(cell.requirement_id);
    if (!requirement) {
      return { text: "未知课程", kind: "unknown", colorKey: "unknown" };
    }

    const subject = indexes.subjectsById.get(requirement.subject_id);
    const subjectName = subject?.name || requirement.subject_id || "未知科目";

    return {
      text: subjectName,
      kind: "lesson",
      colorKey: requirement.subject_id || subjectName,
    };
  }

  if (cell.kind === "split") {
    const block = indexes.splitBlocksById.get(cell.split_block_id);
    if (!block) {
      return { text: "未知走班课程", kind: "unknown", colorKey: "unknown" };
    }

    const subjects = [];
    for (const group of block.groups || []) {
      subjects.push(indexes.subjectsById.get(group.subject_id)?.name || group.subject_id || "未知科目");
    }

    return {
      text: `走班：${subjects.join(" / ") || "未知课程"}`,
      kind: "split",
      colorKey: cell.split_block_id || "split",
    };
  }

  return { text: "未知课程", kind: "unknown", colorKey: "unknown" };
}

function applyBorder(cell) {
  cell.border = {
    top: { style: "thin", color: { argb: BORDER_COLOR } },
    left: { style: "thin", color: { argb: BORDER_COLOR } },
    bottom: { style: "thin", color: { argb: BORDER_COLOR } },
    right: { style: "thin", color: { argb: BORDER_COLOR } },
  };
}

function populateClassSheet(worksheet, state, version, schoolClass, indexes) {
  const workingDays = Math.min(Number(state.settings?.working_days) || 5, WEEKDAYS.length);
  const periodsPerDay = Number(state.settings?.periods_per_day) || 8;
  const lastColumn = 1 + workingDays;
  const schedule = version.class_schedules?.[schoolClass.id] || [];

  worksheet.mergeCells(1, 1, 1, lastColumn);
  worksheet.getCell(1, 1).value = `${version.name || "课表"} - ${schoolClass.name}`;
  worksheet.getCell(1, 1).font = { name: "微软雅黑", size: 18, bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getCell(1, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: TITLE_FILL } };
  worksheet.getCell(1, 1).alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 32;

  const headerRow = worksheet.getRow(2);
  headerRow.values = ["节次", ...WEEKDAYS.slice(0, workingDays)];
  headerRow.height = 24;
  for (let column = 1; column <= lastColumn; column += 1) {
    const cell = headerRow.getCell(column);
    cell.font = { name: "微软雅黑", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    applyBorder(cell);
  }

  for (let period = 0; period < periodsPerDay; period += 1) {
    const row = worksheet.getRow(period + 3);
    row.height = 54;
    const periodCell = row.getCell(1);
    periodCell.value = `第 ${period + 1} 节`;
    periodCell.font = { name: "微软雅黑", size: 10, bold: true, color: { argb: "FF334155" } };
    periodCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: META_FILL } };
    periodCell.alignment = { horizontal: "center", vertical: "middle" };
    applyBorder(periodCell);

    for (let day = 0; day < workingDays; day += 1) {
      const output = formatClassCell(schedule?.[day]?.[period], indexes);
      const cell = row.getCell(day + 2);
      cell.value = output.text;
      cell.font = {
        name: "微软雅黑",
        size: 10,
        bold: output.kind !== "empty",
        color: { argb: output.kind === "empty" ? "FF94A3B8" : "FF0F172A" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: output.kind === "empty" ? SELF_STUDY_FILL : courseFill(output.colorKey) },
      };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      applyBorder(cell);
    }
  }

  worksheet.getColumn(1).width = 10;
  for (let column = 2; column <= lastColumn; column += 1) {
    worksheet.getColumn(column).width = 23;
  }

  worksheet.views = [{ state: "frozen", xSplit: 1, ySplit: 2, topLeftCell: "B3" }];
  worksheet.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: lastColumn } };
  worksheet.pageSetup = {
    orientation: "landscape",
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    printArea: `A1:${worksheet.getColumn(lastColumn).letter}${periodsPerDay + 2}`,
    printTitlesRow: "1:2",
  };
  worksheet.headerFooter.oddFooter = "&L课表调度专家&C第 &P 页，共 &N 页&R&D";
}

export function makeExportFilename(versionName) {
  const base = String(versionName || "课表")
    .replace(INVALID_FILENAME_CHARS, "_")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 100) || "课表";
  return `${base}_全部班级.xlsx`;
}

export function buildClassTimetableWorkbook(state, version) {
  if (!state || !version) {
    throw new Error("缺少课表数据，无法导出");
  }
  if (!Array.isArray(state.classes) || state.classes.length === 0) {
    throw new Error("没有可导出的班级");
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "课表调度专家";
  workbook.subject = version.name || "班级课表";
  workbook.title = `${version.name || "课表"} - 全部班级`;
  workbook.company = "课表调度专家";
  workbook.calcProperties.fullCalcOnLoad = true;

  const indexes = buildScheduleIndexes(state);
  const usedNames = new Set();
  for (const schoolClass of state.classes) {
    const worksheet = workbook.addWorksheet(uniqueSheetName(schoolClass.name, usedNames));
    populateClassSheet(worksheet, state, version, schoolClass, indexes);
  }

  return workbook;
}

export async function downloadClassTimetables(state, version) {
  const workbook = buildClassTimetableWorkbook(state, version);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = makeExportFilename(version.name);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
