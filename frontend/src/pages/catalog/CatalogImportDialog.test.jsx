import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CatalogImportDialog from "./CatalogImportDialog";
import { parseRequirementWorkbook, parseTeacherWorkbook } from "./excelCatalogImport";
import { planCatalogImport } from "./catalogImportMerge";

vi.mock("./excelCatalogImport", () => ({
  formatImportError: vi.fn((error) => (
    `${error.fileName} → ${error.sheetName} → 第 ${error.row} 行 → ${error.column}：${error.message}`
  )),
  safeImportErrorMessage: vi.fn((error) => (
    typeof error?.message === "string" ? error.message : JSON.stringify(error) || "解析失败"
  )),
  parseRequirementWorkbook: vi.fn(),
  parseTeacherWorkbook: vi.fn(),
}));

vi.mock("./catalogImportMerge", () => ({
  planCatalogImport: vi.fn(),
}));

function createFile(name) {
  const file = new File(["xlsx"], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  Object.defineProperty(file, "arrayBuffer", {
    value: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
  });
  return file;
}

function emptySummary() {
  return {
    added: {
      classes: 0,
      subjects: 0,
      rooms: 0,
      teachers: 0,
      courseRequirements: 0,
    },
    updated: {
      classes: 0,
      subjects: 0,
      rooms: 0,
      teachers: 0,
      courseRequirements: 0,
    },
    skipped: 0,
  };
}

const form = {
  settings: { working_days: 6, periods_per_day: 8 },
  classes: [],
  subjects: [],
  rooms: [],
  teachers: [],
  course_requirements: [],
  split_course_blocks: [],
};

describe("CatalogImportDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parseTeacherWorkbook.mockResolvedValue({ rows: [], errors: [], skipped: 0 });
    parseRequirementWorkbook.mockResolvedValue({ rows: [], errors: [], skipped: 0 });
    planCatalogImport.mockReturnValue({
      nextForm: form,
      summary: emptySummary(),
      errors: [],
      created: {
        classes: [],
        subjects: [],
        rooms: [],
        teachers: [],
        courseRequirements: [],
      },
    });
  });

  it("exposes both labeled Excel inputs and disables parsing without a file", () => {
    render(<CatalogImportDialog form={form} open onApply={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByLabelText("教师信息 Excel")).toHaveAttribute("type", "file");
    expect(screen.getByLabelText("教师信息 Excel")).toHaveAttribute("accept", ".xlsx");
    expect(screen.getByLabelText("课程要求 Excel")).toHaveAttribute("type", "file");
    expect(screen.getByLabelText("课程要求 Excel")).toHaveAttribute("accept", ".xlsx");
    expect(screen.getByRole("button", { name: "解析并预览" })).toBeDisabled();
  });

  it("parses the selected teacher file once, previews counts, and applies the plan", async () => {
    let resolveTeacher;
    parseTeacherWorkbook.mockReturnValue(new Promise((resolve) => {
      resolveTeacher = resolve;
    }));
    const nextForm = { ...form, teachers: [{ id: "teacher-1", name: "张老师" }] };
    const created = {
      classes: [],
      subjects: [],
      rooms: [],
      teachers: ["teacher-1"],
      courseRequirements: [],
    };
    planCatalogImport.mockReturnValue({
      nextForm,
      summary: {
        ...emptySummary(),
        added: { ...emptySummary().added, teachers: 1 },
      },
      errors: [],
      created,
    });
    const onApply = vi.fn();

    render(<CatalogImportDialog form={form} open onApply={onApply} onClose={vi.fn()} />);
    const file = createFile("教师.xlsx");
    fireEvent.change(screen.getByLabelText("教师信息 Excel"), { target: { files: [file] } });
    const parseButton = screen.getByRole("button", { name: "解析并预览" });
    fireEvent.click(parseButton);

    expect(await screen.findByRole("button", { name: "解析中…" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "解析中…" }));
    expect(parseTeacherWorkbook).toHaveBeenCalledTimes(1);

    resolveTeacher({
      rows: [{ name: "张老师", homeroomClassName: "", mainSubjectName: "语文" }],
      errors: [],
      skipped: 0,
    });

    expect(await screen.findByText(/新增教师 1/)).toBeInTheDocument();
    expect(screen.getByText(/新增班级 0/)).toBeInTheDocument();
    expect(screen.getByText(/新增课程要求 0/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "应用到草稿" }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ nextForm, created }));
  });

  it("calls only selected parsers and combines parser errors before planning", async () => {
    const parserError = {
      fileType: "requirement",
      fileName: "课程要求.xlsx",
      sheetName: "课程要求",
      row: 3,
      column: "周课时",
      message: "周课时必须为正整数",
      value: 0,
    };
    parseRequirementWorkbook.mockResolvedValue({ rows: [], errors: [parserError], skipped: 2 });
    planCatalogImport.mockReturnValue({
      nextForm: form,
      summary: { ...emptySummary(), skipped: 2 },
      errors: [parserError],
      created: { classes: [], subjects: [], rooms: [], teachers: [], courseRequirements: [] },
    });

    render(<CatalogImportDialog form={form} open onApply={vi.fn()} onClose={vi.fn()} />);
    const file = createFile("课程要求.xlsx");
    fireEvent.change(screen.getByLabelText("课程要求 Excel"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "解析并预览" }));

    await screen.findByText(/周课时必须为正整数/);
    expect(parseRequirementWorkbook).toHaveBeenCalledTimes(1);
    expect(parseTeacherWorkbook).not.toHaveBeenCalled();
    expect(parseRequirementWorkbook).toHaveBeenCalledWith(expect.any(ArrayBuffer), "课程要求.xlsx");
    expect(planCatalogImport).toHaveBeenCalledWith(form, expect.objectContaining({
      teacherRows: [],
      requirementRows: [],
      skipped: 2,
      errors: [parserError],
    }));
    expect(screen.getByRole("button", { name: "应用到草稿" })).toBeDisabled();
  });

  it("parses two selected workbooks sequentially to avoid ExcelJS parser races", async () => {
    let resolveTeacher;
    parseTeacherWorkbook.mockReturnValueOnce(new Promise((resolve) => {
      resolveTeacher = resolve;
    }));

    render(<CatalogImportDialog form={form} open onApply={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("教师信息 Excel"), {
      target: { files: [createFile("教师.xlsx")] },
    });
    fireEvent.change(screen.getByLabelText("课程要求 Excel"), {
      target: { files: [createFile("课程要求.xlsx")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "解析并预览" }));

    await waitFor(() => expect(parseTeacherWorkbook).toHaveBeenCalledTimes(1));
    expect(parseRequirementWorkbook).not.toHaveBeenCalled();

    resolveTeacher({ rows: [], errors: [], skipped: 0 });
    await waitFor(() => expect(parseRequirementWorkbook).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("button", { name: "应用到草稿" })).toBeEnabled();
  });

  it("closes without applying and resets local preview when reopened", async () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(
      <CatalogImportDialog form={form} open onApply={onApply} onClose={onClose} />
    );

    const file = createFile("教师.xlsx");
    fireEvent.change(screen.getByLabelText("教师信息 Excel"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();

    rerender(<CatalogImportDialog form={form} open={false} onApply={onApply} onClose={onClose} />);
    rerender(<CatalogImportDialog form={form} open onApply={onApply} onClose={onClose} />);
    expect(screen.getByLabelText("教师信息 Excel")).toHaveValue("");
    expect(screen.getByRole("button", { name: "解析并预览" })).toBeDisabled();
  });

  it("renders formatted errors and keeps apply disabled when planning fails", async () => {
    const error = {
      fileType: "teacher",
      fileName: "教师.xlsx",
      sheetName: "教师名单",
      row: 2,
      column: "教师姓名",
      message: "教师姓名不能为空",
      value: null,
    };
    planCatalogImport.mockReturnValue({
      nextForm: form,
      summary: emptySummary(),
      errors: [error],
      created: { classes: [], subjects: [], rooms: [], teachers: [], courseRequirements: [] },
    });

    render(<CatalogImportDialog form={form} open onApply={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("教师信息 Excel"), {
      target: { files: [createFile("教师.xlsx")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "解析并预览" }));

    expect(await screen.findByText(/教师\.xlsx → 教师名单 → 第 2 行 → 教师姓名：教师姓名不能为空/))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "应用到草稿" })).toBeDisabled();
  });

  it("renders a safe message when a parser throws a plain object", async () => {
    parseTeacherWorkbook.mockRejectedValueOnce({ code: "BROKEN" });
    planCatalogImport.mockImplementationOnce((_, parsed) => ({
      nextForm: form,
      summary: emptySummary(),
      errors: parsed.errors,
      created: { classes: [], subjects: [], rooms: [], teachers: [], courseRequirements: [] },
    }));

    render(<CatalogImportDialog form={form} open onApply={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("教师信息 Excel"), {
      target: { files: [createFile("教师.xlsx")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "解析并预览" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).not.toContain("[object Object]");
    expect(alert.textContent).toContain("BROKEN");
  });

  it("shows preview error count and names for every newly created entity", async () => {
    const nextForm = {
      ...form,
      classes: [{ id: "class-1", name: "1班" }],
      subjects: [{ id: "subject-1", name: "语文" }],
      rooms: [{ id: "room-1", name: "101" }],
      teachers: [{ id: "teacher-1", name: "张老师" }],
      course_requirements: [{ id: "requirement-1", class_id: "class-1", subject_id: "subject-1" }],
    };
    planCatalogImport.mockReturnValueOnce({
      nextForm,
      summary: {
        ...emptySummary(),
        added: {
          classes: 1,
          subjects: 1,
          rooms: 1,
          teachers: 1,
          courseRequirements: 1,
        },
      },
      errors: [{ fileType: "teacher", fileName: "教师.xlsx", sheetName: "Sheet1", row: 2, column: "教师姓名", message: "提示" }],
      created: {
        classes: ["class-1"],
        subjects: ["subject-1"],
        rooms: ["room-1"],
        teachers: ["teacher-1"],
        courseRequirements: ["requirement-1"],
      },
    });

    render(<CatalogImportDialog form={form} open onApply={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("教师信息 Excel"), {
      target: { files: [createFile("教师.xlsx")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "解析并预览" }));

    const preview = await screen.findByLabelText("导入预览");
    expect(preview).toHaveTextContent("错误 1");
    expect(preview).toHaveTextContent("1班");
    expect(preview).toHaveTextContent("语文");
    expect(preview).toHaveTextContent("101");
    expect(preview).toHaveTextContent("张老师");
    expect(preview).toHaveTextContent("1班 / 语文");
  });

  it("keeps the apply action disabled while the page is saving", async () => {
    render(<CatalogImportDialog form={form} open applyDisabled onApply={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("教师信息 Excel"), {
      target: { files: [createFile("教师.xlsx")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "解析并预览" }));

    expect(await screen.findByRole("button", { name: "应用到草稿" })).toBeDisabled();
  });
});
