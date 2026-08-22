import React, { useState, useEffect } from "react";
import { api } from "../../api/client";
import { AlertTriangle, RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";
import AsyncButton from "../../components/AsyncButton";

export default function RecoveryPanel({ onRestored }) {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const loadBackups = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listBackups();
      setBackups(data || []);
      if (data && data.length > 0) {
        setSelectedBackup(data[0].name || data[0]);
      }
    } catch (err) {
      setError("无法获取备份列表：" + (err.message || "未知错误"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleRestore = async () => {
    if (!selectedBackup || !confirming) return;
    setRestoring(true);
    setError(null);
    try {
      await api.restoreBackup(selectedBackup);
      setSuccessMsg("数据恢复成功！");
      setConfirming(false);
      if (onRestored) {
        setTimeout(onRestored, 1000);
      }
    } catch (err) {
      setError("恢复失败：" + (err.message || "未知错误"));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="bg-[#0b1329] border border-amber-500/30 rounded-2xl p-6 max-w-2xl mx-auto shadow-2xl">
      <div className="flex items-center gap-3 text-amber-400 mb-4">
        <AlertTriangle size={28} />
        <h2 className="text-xl font-bold text-white">数据文件异常或需要恢复</h2>
      </div>
      <p className="text-gray-300 text-sm mb-6">
        系统检测到本地数据文件损坏或不可用。您可以从以下自动保存的历史备份中选择一个快照进行一键恢复。
      </p>

      {error && (
        <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-3 text-red-300 text-sm mb-4">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-xl p-3 text-emerald-300 text-sm mb-4 flex items-center gap-2">
          <ShieldCheck size={18} />
          {successMsg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-400 gap-2">
          <RefreshCw size={20} className="animate-spin text-cyan-400" />
          <span>正在加载备份快照...</span>
        </div>
      ) : backups.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>未找到可用的历史备份快照。</p>
          <button
            onClick={loadBackups}
            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-gray-200"
          >
            重新检测
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
            选择要恢复的备份快照
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {backups.map((b) => {
              const name = typeof b === "string" ? b : b.name;
              const isSelected = selectedBackup === name;
              return (
                <div
                  key={name}
                  onClick={() => {
                    setSelectedBackup(name);
                    setConfirming(false);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-cyan-950/40 border-cyan-500 text-cyan-200"
                      : "bg-slate-900/50 border-slate-800 text-gray-300 hover:border-slate-700"
                  }`}
                >
                  <div className="font-mono text-xs">{name}</div>
                  {isSelected && <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">已选定</span>}
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={loadBackups}
              className="px-3 py-2 text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1.5"
            >
              <RefreshCw size={14} />
              刷新列表
            </button>

            {!confirming ? (
              <button
                disabled={!selectedBackup}
                onClick={() => setConfirming(true)}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-all"
              >
                <RotateCcw size={16} />
                从选定快照恢复
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  className="px-3 py-2 text-xs text-gray-400 hover:text-gray-200"
                >
                  取消
                </button>
                <AsyncButton
                  disabled={restoring}
                  onClick={handleRestore}
                  loading={restoring}
                  loadingLabel="恢复中…"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/30 animate-pulse"
                >
                  <RotateCcw size={16} /> 确认恢复
                </AsyncButton>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
