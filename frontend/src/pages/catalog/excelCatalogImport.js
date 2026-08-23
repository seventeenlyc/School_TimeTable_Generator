import ExcelJS from "exceljs";

const TEACHER_HEADERS = ["教师姓名", "班主任班级", "主教学科"];
const REQUIREMENT_HEADERS = [
  "班级",
  "科目",
  "教师",
  "教室",
  "周课时",
  "连堂课时",
  "固定时间（星期*节次）",
];

const FIXED_SLOT = /^(\d+)\s*\*\s*(\d+)$/;

/**
 * Convert the cell value shapes produced by ExcelJS into a trimmed string.
 * Formula results and rich text are deliberately handled here so all parser
 * fields use the same normalization rules.
 */
export function normalizeCellText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value).trim();
  }
  if (value instanceof Date) return value.toISOString().trim();
  if (Array.isArray(value)) return value.map(normalizeCellText).join("").trim();

  if (typeof value === "object") {
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => normalizeCellText(part?.text ?? part)).join("").trim();
    }
    if (Object.prototype.hasOwnProperty.call(value, "result")) {
      return normalizeCellText(value.result);
    }
    if (Object.prototype.hasOwnProperty.call(value, "text")) {
      return normalizeCellText(value.text);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  return String(value).trim();
}

function displayCellValue(value) {
  const text = normalizeCellText(value);
  return text || "";
}

function sourceLocation(fileType, fileName, sheetName, row) {
  return { fileType, fileName, sheetName, row };
}

function importError(source, column, value, message) {
  return {
    fileType: source?.fileType || "import",
    fileName: source?.fileName || "",
    sheetName: source?.sheetName || "",
    row: source?.row ?? null,
    column: column || "",
    value: value ?? null,
    message: normalizeCellText(message),
  };
}

export function formatImportError(error) {
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return "导入错误";

  const location = [
    displayCellValue(error.fileName),
    displayCellValue(error.sheetName),
    error.row === null || error.row === undefined || error.row === "" ? "" : `第 ${error.row} 行`,
  ].filter(Boolean);
  const column = displayCellValue(error.column);
  const message = displayCellValue(error.message) || "数据无效";
  const detail = `${column ? `${column}：` : ""}${message}`;
  const value = error.value === null || error.value === undefined || displayCellValue(error.value) === ""
    ? ""
    : `（原值：${displayCellValue(error.value)}）`;
  const prefix = location.join(" → ");
  return prefix ? `${prefix} → ${detail}${value}` : `${detail}${value}`;
}

export function parseFixedSlots(value, source) {
  const text = normalizeCellText(value);
  if (!text || text === "/") return { slots: [], errors: [] };

  return text.split(/[，,、;；]+/).reduce((result, token) => {
    const match = token.trim().match(FIXED_SLOT);
    if (!match) {
      result.errors.push(importError(
        source,
        "固定时间（星期*节次）",
        value,
        "格式应为“星期*节次”，例如 1*8",
      ));
      return result;
    }

    const weekday = Number(match[1]);
    const period = Number(match[2]);
    if (weekday < 1 || weekday > 6 || period < 1 || period > 20) {
      result.errors.push(importError(
        source,
        "固定时间（星期*节次）",
        value,
        "星期应为 1–6，节次应为正整数",
      ));
      return result;
    }

    result.slots.push({ weekday: weekday - 1, period: period - 1 });
    return result;
  }, { slots: [], errors: [] });
}

function worksheetHasValues(sheet) {
  const rowCount = sheet?.rowCount || 0;
  for (let rowNumber = 1; rowNumber <= rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    for (let column = 1; column <= row.cellCount; column += 1) {
      if (normalizeCellText(row.getCell(column).value)) return true;
    }
  }
  return false;
}

function firstNonEmptyWorksheet(workbook) {
  const sheets = workbook?.worksheets || [];
  return sheets.find(worksheetHasValues) || sheets[0] || null;
}

function firstNonEmptyRow(sheet) {
  const rowCount = sheet?.rowCount || 0;
  for (let rowNumber = 1; rowNumber <= rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    for (let column = 1; column <= row.cellCount; column += 1) {
      if (normalizeCellText(row.getCell(column).value)) return row;
    }
  }
  return null;
}

function headerIndexes(headerRow, requiredHeaders) {
  const indexes = new Map();
  if (headerRow) {
    for (let column = 1; column <= headerRow.cellCount; column += 1) {
      const header = normalizeCellText(headerRow.getCell(column).value);
      if (header && !indexes.has(header)) indexes.set(header, column);
    }
  }

  const missing = requiredHeaders.filter((header) => !indexes.has(header));
  return { indexes, missing };
}

function emptyWorkbookError(fileType, fileName, sheetName) {
  return importError(
    sourceLocation(fileType, fileName, sheetName, null),
    "",
    null,
    "工作表为空",
  );
}

function missingHeaderErrors(fileType, fileName, sheetName, row, missing) {
  const source = sourceLocation(fileType, fileName, sheetName, row?.number || 1);
  return missing.map((header) => importError(source, header, null, `缺少必需列：${header}`));
}

function rowIsBlank(row, columns) {
  return columns.every((column) => !normalizeCellText(row.getCell(column).value));
}

function positiveInteger(value) {
  const text = normalizeCellText(value);
  if (!text || !/^\d+$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) && Number.isInteger(number) && number > 0 ? number : null;
}

function stableRowKey(row) {
  const normalizedRow = { ...row };
  delete normalizedRow.source;
  return JSON.stringify(normalizedRow);
}

function deduplicateRows(rows, keyFor, conflictErrorFor) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = keyFor(row);
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  });

  const uniqueRows = [];
  const errors = [];
  let skipped = 0;

  groups.forEach((group) => {
    const signatures = new Map();
    group.forEach((row) => {
      const signature = stableRowKey(row);
      const first = signatures.get(signature);
      if (first) {
        skipped += 1;
        return;
      }
      signatures.set(signature, row);
    });

    if (signatures.size === 1) {
      uniqueRows.push(signatures.values().next().value);
      return;
    }

    signatures.forEach((row) => errors.push(conflictErrorFor(row)));
  });

  return { rows: uniqueRows, errors, skipped };
}

async function loadWorkbook(arrayBuffer, fileType, fileName) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(arrayBuffer);
    return { workbook, errors: [] };
  } catch (error) {
    return {
      workbook: null,
      errors: [importError(
        sourceLocation(fileType, fileName, "", null),
        "",
        null,
        `无法读取工作簿：${normalizeCellText(error?.message || error)}`,
      )],
    };
  }
}

export async function parseTeacherWorkbook(arrayBuffer, fileName) {
  const fileType = "teacher";
  const loaded = await loadWorkbook(arrayBuffer, fileType, fileName);
  if (!loaded.workbook) return { rows: [], errors: loaded.errors, sheetName: "", skipped: 0 };

  const sheet = firstNonEmptyWorksheet(loaded.workbook);
  const sheetName = sheet?.name || "";
  if (!sheet || !worksheetHasValues(sheet)) {
    return { rows: [], errors: [emptyWorkbookError(fileType, fileName, sheetName)], sheetName, skipped: 0 };
  }

  const headerRow = firstNonEmptyRow(sheet);
  const { indexes, missing } = headerIndexes(headerRow, TEACHER_HEADERS);
  if (missing.length) {
    return {
      rows: [],
      errors: missingHeaderErrors(fileType, fileName, sheetName, headerRow, missing),
      sheetName,
      skipped: 0,
    };
  }

  const sourceRows = [];
  const parseErrors = [];
  const rowCount = sheet.rowCount || 0;
  const rowColumns = TEACHER_HEADERS.map((header) => indexes.get(header));
  for (let rowNumber = headerRow.number + 1; rowNumber <= rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (rowIsBlank(row, rowColumns)) continue;

    const source = sourceLocation(fileType, fileName, sheetName, rowNumber);
    const name = normalizeCellText(row.getCell(indexes.get("教师姓名")).value);
    const homeroomClassName = normalizeCellText(row.getCell(indexes.get("班主任班级")).value);
    const mainSubjectName = normalizeCellText(row.getCell(indexes.get("主教学科")).value);
    let hasError = false;
    if (!name) {
      parseErrors.push(importError(source, "教师姓名", row.getCell(indexes.get("教师姓名")).value, "教师姓名不能为空"));
      hasError = true;
    }
    if (!mainSubjectName) {
      parseErrors.push(importError(source, "主教学科", row.getCell(indexes.get("主教学科")).value, "主教学科不能为空"));
      hasError = true;
    }
    if (!hasError) sourceRows.push({ name, homeroomClassName, mainSubjectName, source });
  }

  const deduplicated = deduplicateRows(
    sourceRows,
    (row) => row.name,
    (row) => importError(
      row.source,
      "教师姓名",
      row.name,
      `教师姓名“${row.name}”对应的内容存在冲突`,
    ),
  );
  return {
    rows: deduplicated.rows,
    errors: [...parseErrors, ...deduplicated.errors],
    sheetName,
    skipped: deduplicated.skipped,
  };
}

export async function parseRequirementWorkbook(arrayBuffer, fileName) {
  const fileType = "requirement";
  const loaded = await loadWorkbook(arrayBuffer, fileType, fileName);
  if (!loaded.workbook) return { rows: [], errors: loaded.errors, sheetName: "", skipped: 0 };

  const sheet = firstNonEmptyWorksheet(loaded.workbook);
  const sheetName = sheet?.name || "";
  if (!sheet || !worksheetHasValues(sheet)) {
    return { rows: [], errors: [emptyWorkbookError(fileType, fileName, sheetName)], sheetName, skipped: 0 };
  }

  const headerRow = firstNonEmptyRow(sheet);
  const { indexes, missing } = headerIndexes(headerRow, REQUIREMENT_HEADERS);
  if (missing.length) {
    return {
      rows: [],
      errors: missingHeaderErrors(fileType, fileName, sheetName, headerRow, missing),
      sheetName,
      skipped: 0,
    };
  }

  const sourceRows = [];
  const parseErrors = [];
  const rowCount = sheet.rowCount || 0;
  const rowColumns = REQUIREMENT_HEADERS.map((header) => indexes.get(header));
  for (let rowNumber = headerRow.number + 1; rowNumber <= rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (rowIsBlank(row, rowColumns)) continue;

    const source = sourceLocation(fileType, fileName, sheetName, rowNumber);
    const className = normalizeCellText(row.getCell(indexes.get("班级")).value);
    const subjectName = normalizeCellText(row.getCell(indexes.get("科目")).value);
    const teacherName = normalizeCellText(row.getCell(indexes.get("教师")).value);
    const roomName = normalizeCellText(row.getCell(indexes.get("教室")).value);
    const periodsValue = row.getCell(indexes.get("周课时")).value;
    const periodsPerWeek = positiveInteger(periodsValue);
    const fixedValue = row.getCell(indexes.get("固定时间（星期*节次）")).value;
    const fixed = parseFixedSlots(fixedValue, source);
    let hasError = fixed.errors.length > 0;

    if (!className) {
      parseErrors.push(importError(source, "班级", row.getCell(indexes.get("班级")).value, "班级不能为空"));
      hasError = true;
    }
    if (!subjectName) {
      parseErrors.push(importError(source, "科目", row.getCell(indexes.get("科目")).value, "科目不能为空"));
      hasError = true;
    }
    if (!teacherName) {
      parseErrors.push(importError(source, "教师", row.getCell(indexes.get("教师")).value, "教师不能为空"));
      hasError = true;
    }
    if (periodsPerWeek === null) {
      parseErrors.push(importError(source, "周课时", periodsValue, "周课时必须为正整数"));
      hasError = true;
    }
    if (fixed.errors.length) parseErrors.push(...fixed.errors);
    if (!hasError) {
      sourceRows.push({
        className,
        subjectName,
        teacherName,
        roomName,
        periodsPerWeek,
        fixedSlots: fixed.slots,
        source,
      });
    }
  }

  const deduplicated = deduplicateRows(
    sourceRows,
    (row) => `${row.className}\u0000${row.subjectName}`,
    (row) => importError(
      row.source,
      "班级",
      row.className,
      `班级“${row.className}”与科目“${row.subjectName}”的课程要求存在冲突`,
    ),
  );
  return {
    rows: deduplicated.rows,
    errors: [...parseErrors, ...deduplicated.errors],
    sheetName,
    skipped: deduplicated.skipped,
  };
}
