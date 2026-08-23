import ExcelJS from "exceljs";
import JSZip from "jszip";

const SPREADSHEETML_NAMESPACE = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

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

const INVALID_CELL_VALUE_MESSAGE = "单元格类型非法，仅支持文本、数字、富文本或带标量结果的公式";

export function safeImportErrorMessage(error, fallback = "解析失败") {
  const directMessage = typeof error === "string"
    ? error
    : (typeof error?.message === "string" ? error.message : "");
  if (directMessage.trim()) return directMessage.trim();

  if (error && typeof error === "object") {
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== "{}") return serialized;
    } catch {
      // Fall through to the fixed Chinese fallback for circular objects.
    }
  }

  if (error !== null && error !== undefined && typeof error !== "object") {
    const primitive = String(error).trim();
    if (primitive && primitive !== "[object Object]") return primitive;
  }
  return fallback;
}

function isScalarCellValue(value) {
  return value === null
    || typeof value === "string"
    || (typeof value === "number" && Number.isFinite(value));
}

function isRichTextCellValue(value) {
  return value
    && typeof value === "object"
    && Array.isArray(value.richText)
    && value.richText.every((part) => part && typeof part === "object" && typeof part.text === "string");
}

function isFormulaCellValue(value) {
  return value
    && typeof value === "object"
    && typeof value.formula === "string"
    && Object.prototype.hasOwnProperty.call(value, "result")
    && isScalarCellValue(value.result);
}

function invalidCellValueMessage(value) {
  if (value === undefined || isScalarCellValue(value) || isRichTextCellValue(value) || isFormulaCellValue(value)) {
    return "";
  }
  return INVALID_CELL_VALUE_MESSAGE;
}

/**
 * Convert the cell value shapes produced by ExcelJS into a trimmed string.
 * Formula results and rich text are deliberately handled here so all parser
 * fields use the same normalization rules.
 */
export function normalizeCellText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value).trim();
  }
  if (isRichTextCellValue(value)) return value.richText.map((part) => part.text).join("").trim();
  if (isFormulaCellValue(value)) return normalizeCellText(value.result);
  return "";
}

function displayCellValue(value) {
  const text = normalizeCellText(value);
  if (text) return text;
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "未知对象";
    }
  }
  return String(value).trim();
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
  const invalidValueMessage = invalidCellValueMessage(value);
  if (invalidValueMessage) {
    return {
      slots: [],
      errors: [importError(source, "固定时间（星期*节次）", value, invalidValueMessage)],
    };
  }
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
      const value = row.getCell(column).value;
      if (normalizeCellText(value) || invalidCellValueMessage(value)) return true;
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
      const value = row.getCell(column).value;
      if (normalizeCellText(value) || invalidCellValueMessage(value)) return row;
    }
  }
  return null;
}

function headerIndexes(headerRow, requiredHeaders) {
  const indexes = new Map();
  const invalid = [];
  if (headerRow) {
    for (let column = 1; column <= headerRow.cellCount; column += 1) {
      const value = headerRow.getCell(column).value;
      if (invalidCellValueMessage(value)) {
        invalid.push({ column, value });
        continue;
      }
      const header = normalizeCellText(value);
      if (header && !indexes.has(header)) indexes.set(header, column);
    }
  }

  const missing = requiredHeaders.filter((header) => !indexes.has(header));
  return { indexes, missing, invalid };
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

function invalidHeaderErrors(fileType, fileName, sheetName, row, invalid) {
  const source = sourceLocation(fileType, fileName, sheetName, row?.number || 1);
  return invalid.map(({ column, value }) => importError(source, `第 ${column} 列`, value, INVALID_CELL_VALUE_MESSAGE));
}

function rowIsBlank(row) {
  for (let column = 1; column <= row.cellCount; column += 1) {
    const value = row.getCell(column).value;
    if (normalizeCellText(value) || invalidCellValueMessage(value)) return false;
  }
  return true;
}

function normalizeImportCell(value, source, column, errors) {
  const message = invalidCellValueMessage(value);
  if (message) {
    errors.push(importError(source, column, value, message));
    return { text: "", invalid: true };
  }
  return { text: normalizeCellText(value), invalid: false };
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
      if (!signatures.has(signature)) signatures.set(signature, row);
    });

    if (signatures.size > 1) {
      group.forEach((row) => errors.push(conflictErrorFor(row)));
      return;
    }

    uniqueRows.push(signatures.values().next().value);
    skipped += group.length - 1;
  });

  return { rows: uniqueRows, errors, skipped };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSpreadsheetXmlNamespace(xml) {
  const namespacePattern = new RegExp(
    `xmlns:([A-Za-z_][\\w.-]*)=(["'])${escapeRegExp(SPREADSHEETML_NAMESPACE)}\\2`,
    "g",
  );
  const prefixes = [...xml.matchAll(namespacePattern)].map((match) => match[1]);
  if (!prefixes.length) return xml;

  const hasDefaultNamespace = new RegExp(
    `xmlns=(["'])${escapeRegExp(SPREADSHEETML_NAMESPACE)}\\1`,
  ).test(xml);
  let normalized = xml;
  prefixes.forEach((prefix, index) => {
    const declaration = new RegExp(
      `\\s+xmlns:${escapeRegExp(prefix)}=(["'])${escapeRegExp(SPREADSHEETML_NAMESPACE)}\\1`,
      "g",
    );
    normalized = normalized.replace(
      declaration,
      !hasDefaultNamespace && index === 0 ? ` xmlns="${SPREADSHEETML_NAMESPACE}"` : "",
    );
    normalized = normalized.replace(
      new RegExp(`<(\\/?)${escapeRegExp(prefix)}:`, "g"),
      "<$1",
    );
  });
  return normalized;
}

async function normalizeSpreadsheetXmlNamespaces(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const workbookEntry = zip.file("xl/workbook.xml");
  if (!workbookEntry) return arrayBuffer;

  const workbookXml = await workbookEntry.async("string");
  if (normalizeSpreadsheetXmlNamespace(workbookXml) === workbookXml) return arrayBuffer;

  await Promise.all(Object.values(zip.files).map(async (entry) => {
    if (entry.dir || !entry.name.endsWith(".xml")) return;
    const xml = await entry.async("string");
    const normalized = normalizeSpreadsheetXmlNamespace(xml);
    if (normalized !== xml) zip.file(entry.name, normalized);
  }));
  return zip.generateAsync({ type: "arraybuffer" });
}

async function loadWorkbook(arrayBuffer, fileType, fileName) {
  const workbook = new ExcelJS.Workbook();
  try {
    const compatibleBuffer = await normalizeSpreadsheetXmlNamespaces(arrayBuffer);
    await workbook.xlsx.load(compatibleBuffer);
    return { workbook, errors: [] };
  } catch (error) {
    return {
      workbook: null,
      errors: [importError(
        sourceLocation(fileType, fileName, "", null),
        "",
        null,
        `无法读取工作簿：${safeImportErrorMessage(error)}`,
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
  const { indexes, missing, invalid } = headerIndexes(headerRow, TEACHER_HEADERS);
  if (missing.length || invalid.length) {
    return {
      rows: [],
      errors: [
        ...invalidHeaderErrors(fileType, fileName, sheetName, headerRow, invalid),
        ...missingHeaderErrors(fileType, fileName, sheetName, headerRow, missing),
      ],
      sheetName,
      skipped: 0,
    };
  }

  const sourceRows = [];
  const parseErrors = [];
  const rowCount = sheet.rowCount || 0;
  for (let rowNumber = headerRow.number + 1; rowNumber <= rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (rowIsBlank(row)) continue;

    const source = sourceLocation(fileType, fileName, sheetName, rowNumber);
    const nameValue = row.getCell(indexes.get("教师姓名")).value;
    const homeroomValue = row.getCell(indexes.get("班主任班级")).value;
    const mainSubjectValue = row.getCell(indexes.get("主教学科")).value;
    const nameCell = normalizeImportCell(nameValue, source, "教师姓名", parseErrors);
    const homeroomCell = normalizeImportCell(homeroomValue, source, "班主任班级", parseErrors);
    const mainSubjectCell = normalizeImportCell(mainSubjectValue, source, "主教学科", parseErrors);
    const name = nameCell.text;
    const homeroomClassName = homeroomCell.text;
    const mainSubjectName = mainSubjectCell.text;
    let hasError = nameCell.invalid || homeroomCell.invalid || mainSubjectCell.invalid;
    if (!nameCell.invalid && !name) {
      parseErrors.push(importError(source, "教师姓名", row.getCell(indexes.get("教师姓名")).value, "教师姓名不能为空"));
      hasError = true;
    }
    if (!mainSubjectCell.invalid && !mainSubjectName) {
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
  const { indexes, missing, invalid } = headerIndexes(headerRow, REQUIREMENT_HEADERS);
  if (missing.length || invalid.length) {
    return {
      rows: [],
      errors: [
        ...invalidHeaderErrors(fileType, fileName, sheetName, headerRow, invalid),
        ...missingHeaderErrors(fileType, fileName, sheetName, headerRow, missing),
      ],
      sheetName,
      skipped: 0,
    };
  }

  const sourceRows = [];
  const parseErrors = [];
  const rowCount = sheet.rowCount || 0;
  for (let rowNumber = headerRow.number + 1; rowNumber <= rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (rowIsBlank(row)) continue;

    const source = sourceLocation(fileType, fileName, sheetName, rowNumber);
    const classValue = row.getCell(indexes.get("班级")).value;
    const subjectValue = row.getCell(indexes.get("科目")).value;
    const teacherValue = row.getCell(indexes.get("教师")).value;
    const roomValue = row.getCell(indexes.get("教室")).value;
    const periodsValue = row.getCell(indexes.get("周课时")).value;
    const consecutiveValue = row.getCell(indexes.get("连堂课时")).value;
    const fixedValue = row.getCell(indexes.get("固定时间（星期*节次）")).value;
    const classCell = normalizeImportCell(classValue, source, "班级", parseErrors);
    const subjectCell = normalizeImportCell(subjectValue, source, "科目", parseErrors);
    const teacherCell = normalizeImportCell(teacherValue, source, "教师", parseErrors);
    const roomCell = normalizeImportCell(roomValue, source, "教室", parseErrors);
    const periodsCell = normalizeImportCell(periodsValue, source, "周课时", parseErrors);
    const consecutiveCell = normalizeImportCell(consecutiveValue, source, "连堂课时", parseErrors);
    const className = classCell.text;
    const subjectName = subjectCell.text;
    const teacherName = teacherCell.text;
    const roomName = roomCell.text;
    const periodsPerWeek = periodsCell.invalid ? null : positiveInteger(periodsCell.text);
    const fixed = parseFixedSlots(fixedValue, source);
    let hasError = classCell.invalid
      || subjectCell.invalid
      || teacherCell.invalid
      || roomCell.invalid
      || periodsCell.invalid
      || consecutiveCell.invalid
      || fixed.errors.length > 0;

    if (!classCell.invalid && !className) {
      parseErrors.push(importError(source, "班级", row.getCell(indexes.get("班级")).value, "班级不能为空"));
      hasError = true;
    }
    if (!subjectCell.invalid && !subjectName) {
      parseErrors.push(importError(source, "科目", row.getCell(indexes.get("科目")).value, "科目不能为空"));
      hasError = true;
    }
    if (!teacherCell.invalid && !teacherName) {
      parseErrors.push(importError(source, "教师", row.getCell(indexes.get("教师")).value, "教师不能为空"));
      hasError = true;
    }
    if (!periodsCell.invalid && periodsPerWeek === null) {
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
