import React, { useEffect, useState } from "react";
import { AlertCircle, MapPin } from "lucide-react";

function ErrorEntry({ error, onLocate }) {
  const targets = Array.isArray(error.targets) ? error.targets : [];
  const [targetIndex, setTargetIndex] = useState(0);
  const currentTargetIndex = targets.length ? Math.min(targetIndex, targets.length - 1) : 0;

  useEffect(() => {
    if (targetIndex !== currentTargetIndex) setTargetIndex(currentTargetIndex);
  }, [currentTargetIndex, targetIndex]);

  const locate = (index) => {
    const safeIndex = targets.length ? Math.min(index, targets.length - 1) : 0;
    const target = targets[safeIndex];
    if (!target) return;
    setTargetIndex(safeIndex);
    onLocate?.(target);
  };

  return (
    <li className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-3">
      <div className="flex items-start gap-2">
        <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-300" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-rose-200">{error.title || "数据校验提示"}</div>
          <div className="text-xs text-rose-100/90">{error.message}</div>
          {error.location && <div className="mt-1 text-[11px] text-rose-200/70">位置：{error.location}</div>}
          {targets.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => locate(currentTargetIndex)}
                className="inline-flex items-center gap-1 rounded border border-rose-300/40 px-2 py-1 text-[11px] text-rose-100 hover:bg-rose-900/60 focus:outline-none focus:ring-2 focus:ring-rose-300"
              >
                <MapPin size={12} aria-hidden="true" /> 查看错误位置
              </button>
              {targets.length > 1 && (
                <button
                  type="button"
                  onClick={() => locate((currentTargetIndex + 1) % targets.length)}
                  className="rounded border border-rose-300/30 px-2 py-1 text-[11px] text-rose-200 hover:bg-rose-900/60 focus:outline-none focus:ring-2 focus:ring-rose-300"
                >
                  查看下一处
                </button>
              )}
              <span className="text-[11px] text-rose-200/60">{currentTargetIndex + 1}/{targets.length}</span>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export default function CatalogErrorPanel({ errors = [], onLocate }) {
  if (!errors.length) return null;
  return (
    <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-rose-300" role="alert">
      <div className="mb-3 flex items-center gap-2 font-bold">
        <AlertCircle size={16} aria-hidden="true" /> 数据校验提示
      </div>
      <ul className="space-y-2 text-xs">
        {errors.map((error, index) => (
          <ErrorEntry key={`${error.code || "error"}-${index}`} error={error} onLocate={onLocate} />
        ))}
      </ul>
    </div>
  );
}
