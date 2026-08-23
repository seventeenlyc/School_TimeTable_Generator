import React, { useEffect, useRef, useState } from "react";
import AsyncButton from "../../components/AsyncButton";
import {
  formatImportError,
  parseRequirementWorkbook,
  parseTeacherWorkbook,
  safeImportErrorMessage,
} from "./excelCatalogImport";
import { planCatalogImport } from "./catalogImportMerge";

const SUMMARY_ITEMS = [
  ["classes", "班级"],
  ["subjects", "科目"],
  ["rooms", "教室"],
  ["teachers", "教师"],
  ["courseRequirements", "课程要求"],
];

const CREATED_NAME_ITEMS = [
  ["classes", "班级"],
  ["subjects", "科目"],
  ["rooms", "教室"],
  ["teachers", "教师"],
  ["courseRequirements", "课程要求"],
];

function emptyParseResult() {
  return { rows: [], errors: [], skipped: 0 };
}

function parserException(error, fileType, fileName) {
  return {
    fileType,
    fileName,
    sheetName: "",
    row: null,
    column: "",
    value: null,
    message: safeImportErrorMessage(error),
  };
}

function countValue(summary, section, key) {
  const value = summary?.[section]?.[key];
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function createdNames(nextForm, created, key) {
  const createdIds = Array.isArray(created?.[key]) ? created[key] : [];
  if (!createdIds.length) return [];
  const collectionKey = key === "courseRequirements" ? "course_requirements" : key;
  const entities = Array.isArray(nextForm?.[collectionKey]) ? nextForm[collectionKey] : [];
  const entityById = new Map(entities.map((entity) => [entity?.id, entity]));
  return createdIds.map((id) => entityById.get(id)).filter(Boolean).map((entity) => {
    if (key !== "courseRequirements") return entity.name || entity.id;
    const className = entities.length && nextForm?.classes?.find((item) => item?.id === entity.class_id)?.name;
    const subjectName = entities.length && nextForm?.subjects?.find((item) => item?.id === entity.subject_id)?.name;
    return [className || entity.class_id, subjectName || entity.subject_id].filter(Boolean).join(" / ") || entity.id;
  });
}

export default function CatalogImportDialog({ form, open, applyDisabled = false, onApply, onClose }) {
  const [teacherFile, setTeacherFile] = useState(null);
  const [requirementFile, setRequirementFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [applied, setApplied] = useState(false);
  const teacherInputRef = useRef(null);
  const requirementInputRef = useRef(null);
  const wasOpenRef = useRef(false);
  const parsingRef = useRef(false);
  const runIdRef = useRef(0);
  const appliedRef = useRef(false);

  const resetDialog = () => {
    runIdRef.current += 1;
    parsingRef.current = false;
    appliedRef.current = false;
    setTeacherFile(null);
    setRequirementFile(null);
    setParsing(false);
    setPreview(null);
    setErrors([]);
    setApplied(false);
    if (teacherInputRef.current) teacherInputRef.current.value = "";
    if (requirementInputRef.current) requirementInputRef.current.value = "";
  };

  useEffect(() => {
    if (open && !wasOpenRef.current) resetDialog();
    wasOpenRef.current = open;
  }, [open]);

  const clearPreview = () => {
    setPreview(null);
    setErrors([]);
    setApplied(false);
    appliedRef.current = false;
  };

  const handleFileChange = (setter) => (event) => {
    setter(event.target.files?.[0] || null);
    clearPreview();
  };

  const parseSelectedFile = async (file, fileType, parser) => {
    if (!file) return emptyParseResult();
    try {
      const arrayBuffer = await file.arrayBuffer();
      return await parser(arrayBuffer, file.name);
    } catch (error) {
      return {
        ...emptyParseResult(),
        errors: [parserException(error, fileType, file.name)],
      };
    }
  };

  const handlePreview = async () => {
    if (parsingRef.current || (!teacherFile && !requirementFile)) return;

    parsingRef.current = true;
    const runId = ++runIdRef.current;
    setParsing(true);
    setPreview(null);
    setErrors([]);
    setApplied(false);
    appliedRef.current = false;

    try {
      const [teacherResult, requirementResult] = await Promise.all([
        parseSelectedFile(teacherFile, "teacher", parseTeacherWorkbook),
        parseSelectedFile(requirementFile, "requirement", parseRequirementWorkbook),
      ]);
      const parsed = {
        teacherRows: Array.isArray(teacherResult?.rows) ? teacherResult.rows : [],
        requirementRows: Array.isArray(requirementResult?.rows) ? requirementResult.rows : [],
        errors: [
          ...(Array.isArray(teacherResult?.errors) ? teacherResult.errors : []),
          ...(Array.isArray(requirementResult?.errors) ? requirementResult.errors : []),
        ],
        skipped: Number(teacherResult?.skipped || 0) + Number(requirementResult?.skipped || 0),
      };
      const result = planCatalogImport(form, parsed);
      if (runId !== runIdRef.current) return;
      const nextPreview = result || {
        nextForm: form,
        summary: null,
        errors: [{ fileType: "merge", fileName: "", sheetName: "", row: null, column: "", message: "预览失败" }],
        created: {},
      };
      const nextErrors = Array.isArray(nextPreview.errors) ? nextPreview.errors : [];
      setPreview(nextPreview);
      setErrors(nextErrors);
    } catch (error) {
      if (runId !== runIdRef.current) return;
      setPreview(null);
      setErrors([parserException(error, "import", "")]);
    } finally {
      if (runId === runIdRef.current) {
        parsingRef.current = false;
        setParsing(false);
      }
    }
  };

  const handleApply = () => {
    if (appliedRef.current || applyDisabled || parsing || !preview || errors.length > 0) return;
    appliedRef.current = true;
    setApplied(true);
    onApply?.({ nextForm: preview.nextForm, created: preview.created });
  };

  if (!open) return null;

  const summary = preview?.summary;
  const skipped = Number.isFinite(Number(summary?.skipped)) ? Number(summary.skipped) : 0;
  const formattedErrors = errors.map((error) => formatImportError(error));
  const createdNameItems = CREATED_NAME_ITEMS.map(([key, label]) => ({
    key,
    label,
    names: createdNames(preview?.nextForm, preview?.created, key),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-import-dialog-title"
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="catalog-import-dialog-title" className="text-xl font-semibold text-white">
              Excel 基础数据导入
            </h2>
            <p className="mt-1 text-sm text-slate-400">选择文件后解析并预览，确认无误再应用到草稿。</p>
          </div>
          <button
            type="button"
            aria-label="关闭导入弹窗"
            onClick={() => onClose?.()}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="catalog-import-teachers" className="mb-1 block text-sm font-medium text-slate-200">
              教师信息 Excel
            </label>
            <input
              ref={teacherInputRef}
              id="catalog-import-teachers"
              type="file"
              accept=".xlsx"
              disabled={parsing}
              onChange={handleFileChange(setTeacherFile)}
              className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-slate-700 file:px-2 file:py-1 file:text-slate-200"
            />
            {teacherFile && <p className="mt-1 text-xs text-slate-500">已选择：{teacherFile.name}</p>}
          </div>
          <div>
            <label htmlFor="catalog-import-requirements" className="mb-1 block text-sm font-medium text-slate-200">
              课程要求 Excel
            </label>
            <input
              ref={requirementInputRef}
              id="catalog-import-requirements"
              type="file"
              accept=".xlsx"
              disabled={parsing}
              onChange={handleFileChange(setRequirementFile)}
              className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-slate-700 file:px-2 file:py-1 file:text-slate-200"
            />
            {requirementFile && <p className="mt-1 text-xs text-slate-500">已选择：{requirementFile.name}</p>}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => onClose?.()}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            取消
          </button>
          <AsyncButton
            type="button"
            onClick={handlePreview}
            loading={parsing}
            loadingLabel="解析中…"
            disabled={parsing || (!teacherFile && !requirementFile)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            解析并预览
          </AsyncButton>
        </div>

        {preview && (
          <section aria-label="导入预览" className="mt-6 rounded-lg border border-slate-700 bg-slate-950/40 p-4">
            <h3 className="text-base font-semibold text-white">导入预览</h3>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
              {SUMMARY_ITEMS.map(([key, label]) => (
                <div key={key} className="flex flex-col gap-1 rounded bg-slate-800/70 px-3 py-2">
                  <span className="text-slate-300">{label}</span>
                  <span className="text-xs text-emerald-300">新增{label} {countValue(summary, "added", key)}</span>
                  <span className="text-xs text-amber-300">更新{label} {countValue(summary, "updated", key)}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">跳过重复行 {skipped}</p>
            <p className="mt-1 text-xs text-rose-300">错误 {errors.length}</p>
            <div aria-label="新增数据名称" className="mt-4 space-y-1 text-xs text-slate-300">
              <h4 className="font-medium text-slate-200">新增名称</h4>
              {createdNameItems.map(({ key, label, names }) => (
                <p key={key}>
                  新增{label}名称：{names.length ? names.join("、") : "无"}
                </p>
              ))}
            </div>
          </section>
        )}

        {errors.length > 0 && (
          <section aria-label="导入错误" role="alert" className="mt-5 rounded-lg border border-rose-800/70 bg-rose-950/30 p-4">
            <h3 className="text-sm font-semibold text-rose-200">无法应用导入结果</h3>
            <ul className="mt-2 space-y-1 text-sm text-rose-100">
              {formattedErrors.map((message, index) => (
                <li key={`${index}-${message}`}>{message}</li>
              ))}
            </ul>
          </section>
        )}

        {preview && (
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={handleApply}
              disabled={applyDisabled || parsing || errors.length > 0 || applied}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {applied ? "已应用到草稿" : "应用到草稿"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
