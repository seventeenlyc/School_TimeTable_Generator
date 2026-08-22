import React from "react";
import { formatCell } from "../domain/schedule";
import { User, MapPin, Sparkles } from "lucide-react";

const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六"];

export default function ScheduleGrid({
  grid = [],
  indexes,
  editable = false,
  onCellClick,
  selectedSlot,
  dateOverrides = {},
}) {
  const periodsCount = grid[0]?.length || 7;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/60 shadow-xl backdrop-blur-md">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-800/80 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <th className="py-3 px-4 w-16 text-center">节次</th>
            {WEEKDAYS.map((dayName, dIdx) => (
              <th key={dIdx} className="py-3 px-4 min-w-[140px] text-center">
                {dayName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80 text-sm">
          {Array.from({ length: periodsCount }).map((_, periodIdx) => (
            <tr key={periodIdx} className="hover:bg-slate-800/20 transition-colors">
              <td className="py-3 px-4 text-center font-mono font-medium text-slate-400 bg-slate-800/40">
                第 {periodIdx + 1} 节
              </td>
              {Array.from({ length: 6 }).map((_, dayIdx) => {
                const cell = grid[dayIdx]?.[periodIdx] || { kind: "empty" };
                const overrideKey = `${dayIdx}_${periodIdx}`;
                const override = dateOverrides[overrideKey];
                const formatted = formatCell(cell, indexes, override);
                const isSelected =
                  selectedSlot &&
                  selectedSlot.day === dayIdx &&
                  selectedSlot.period === periodIdx;

                return (
                  <td
                    key={dayIdx}
                    onClick={() => editable && onCellClick && onCellClick({ day: dayIdx, period: periodIdx, cell })}
                    className={`p-2.5 transition-all text-center align-top relative ${
                      editable ? "cursor-pointer" : ""
                    } ${
                      isSelected
                        ? "bg-emerald-500/20 ring-2 ring-emerald-400 ring-inset"
                        : "hover:bg-slate-800/40"
                    }`}
                  >
                    {formatted.kind === "empty" ? (
                      <div className="h-16 flex items-center justify-center text-xs text-slate-600 font-mono">
                        自习
                      </div>
                    ) : formatted.kind === "split" ? (
                      <div className="min-h-16 p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30 flex flex-col justify-between text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-300 flex items-center gap-1">
                            <Sparkles size={11} className="text-indigo-400" />
                            {formatted.title}
                          </span>
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1 rounded">
                            走班
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-1">
                          <User size={10} className="text-slate-400 shrink-0" />
                          <span className="truncate">{formatted.subtitle}</span>
                        </div>
                        {formatted.room && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={9} className="text-slate-500 shrink-0" />
                            <span className="truncate">{formatted.room}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className={`min-h-16 p-2 rounded-lg border flex flex-col justify-between text-left ${
                          formatted.isSubstituted
                            ? "bg-amber-950/40 border-amber-500/40"
                            : "bg-slate-800/70 border-slate-700/60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-300">
                            {formatted.title}
                          </span>
                          {formatted.isSubstituted && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 rounded font-semibold">
                              代课
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-1">
                          <User size={10} className="text-slate-400 shrink-0" />
                          <span className="truncate">
                            {formatted.isSubstituted
                              ? `${formatted.substituteTeacherName} (代)`
                              : formatted.subtitle}
                          </span>
                        </div>
                        {formatted.room && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={9} className="text-slate-500 shrink-0" />
                            <span className="truncate">{formatted.room}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
