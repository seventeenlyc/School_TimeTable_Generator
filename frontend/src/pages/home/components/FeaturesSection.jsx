import { useState, useEffect } from "react";
import { Clock, Shield, School, FileText, Edit3, Download, Zap, Target, Database } from "lucide-react";

function FeaturesSection() {
  const [conflictStatus, setConflictStatus] = useState("conflict");

  useEffect(() => {
    const interval = setInterval(() => {
      setConflictStatus(prev => (prev === "conflict" ? "resolved" : "conflict"));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="features-section">
      <div className="features-header text-center mb-16">
        <h2 className="features-title">Core Capabilities</h2>
        <p className="features-subtitle">
          An advanced suite of scheduling features designed to manage the complexity of academic planning
        </p>
      </div>

      {/* Bento Grid */}
      <div className="bento-grid">
        {/* 1. Time-Saving Automation (Double column on desktop) */}
        <div className="bento-card bento-card-automation lg:col-span-2 lg:flex-row gap-6 items-center">
          <div className="flex-1 flex flex-col justify-between h-full">
            <div>
              <div className="bento-icon-container bg-gradient-purple text-white">
                <Clock size={22} />
              </div>
              <h3 className="bento-card-title">Time-Saving Automation</h3>
              <p className="bento-card-desc">
                Saves hours of manual scheduling with intelligent, constraint-based solver algorithms.
              </p>
            </div>
            <div className="mt-auto text-xs text-purple-400 font-semibold flex items-center gap-1.5">
              <span>Optimization engine active</span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping"></span>
            </div>
          </div>
          <div className="w-full lg:w-[280px] shrink-0 h-[120px] bento-visual-container flex items-center justify-center bg-purple-500/5 border border-purple-500/10">
            <div className="automation-visual-grid">
              <div className="automation-visual-cell">
                <div className="automation-visual-block av-b1"></div>
              </div>
              <div className="automation-visual-cell">
                <div className="automation-visual-block av-b2"></div>
              </div>
              <div className="automation-visual-cell">
                <div className="automation-visual-block av-b3"></div>
              </div>
              <div className="automation-visual-cell">
                <div className="automation-visual-block av-b4"></div>
              </div>
              <div className="automation-visual-cell">
                <div className="automation-visual-block av-b2"></div>
              </div>
              <div className="automation-visual-cell">
                <div className="automation-visual-block av-b4"></div>
              </div>
              <div className="automation-visual-cell">
                <div className="automation-visual-block av-b1"></div>
              </div>
              <div className="automation-visual-cell">
                <div className="automation-visual-block av-b3"></div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Conflict Prevention */}
        <div className="bento-card bento-card-conflict">
          <div>
            <div className="bento-icon-container bg-gradient-blue text-white">
              <Shield size={22} />
            </div>
            <h3 className="bento-card-title">Conflict Prevention</h3>
            <p className="bento-card-desc">
              Prevents teacher/class conflicts with smart, real-time multi-matrix validation.
            </p>
          </div>
          <div className="bento-visual-container bg-blue-500/5 border border-blue-500/10">
            <div className="conflict-badge-container">
              {conflictStatus === "conflict" ? (
                <div className="px-3.5 py-1.5 rounded-full text-[10px] font-bold bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                  <span>Conflict Detected</span>
                </div>
              ) : (
                <div className="px-3.5 py-1.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>Auto-Resolved</span>
                </div>
              )}
              <div className="text-[10px] text-gray-500 font-medium">Checking availability matrices</div>
            </div>
          </div>
        </div>

        {/* 3. Universal Compatibility */}
        <div className="bento-card bento-card-compatibility">
          <div>
            <div className="bento-icon-container bg-gradient-green text-white">
              <School size={22} />
            </div>
            <h3 className="bento-card-title">Universal Compatibility</h3>
            <p className="bento-card-desc">
              Works for any school, college, university, or customized academic institution.
            </p>
          </div>
          <div className="bento-visual-container bg-emerald-500/5 border border-emerald-500/10">
            <div className="compatibility-floating-badges">
              <span className="comp-badge comp-b1">K-12 School</span>
              <span className="comp-badge comp-b2">University</span>
              <span className="comp-badge comp-b3">College</span>
            </div>
          </div>
        </div>

        {/* 4. Export Options */}
        <div className="bento-card bento-card-exports">
          <div>
            <div className="bento-icon-container bg-gradient-orange text-white">
              <FileText size={22} />
            </div>
            <h3 className="bento-card-title">Export Options</h3>
            <p className="bento-card-desc">
              Export timetables as print-ready PDF or highly detailed Excel files with one click.
            </p>
          </div>
          <div className="bento-visual-container bg-orange-500/5 border border-orange-500/10">
            <div className="export-mock-buttons">
              <div className="export-btn-mock export-btn-pdf">
                <FileText size={14} />
                <span>PDF</span>
              </div>
              <div className="export-btn-mock export-btn-excel">
                <FileText size={14} />
                <span>Excel</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Dynamic Editing */}
        <div className="bento-card bento-card-editing">
          <div>
            <div className="bento-icon-container bg-gradient-violet text-white">
              <Edit3 size={22} />
            </div>
            <h3 className="bento-card-title">Dynamic Editing</h3>
            <p className="bento-card-desc">
              Real-time editing with instant validation checks and dynamic slot swapping.
            </p>
          </div>
          <div className="bento-visual-container bg-violet-500/5 border border-violet-500/10">
            <div className="swapper-grid">
              <div className="swapper-cell swapper-cell-active1">Math</div>
              <div className="swapper-cell swapper-cell-active2">Physics</div>
              <div className="swapper-cell text-gray-500">History</div>
            </div>
          </div>
        </div>

        {/* 6. Multiple Formats */}
        <div className="bento-card bento-card-formats">
          <div>
            <div className="bento-icon-container bg-gradient-sky text-white">
              <Download size={22} />
            </div>
            <h3 className="bento-card-title">Multiple Formats</h3>
            <p className="bento-card-desc">
              Support for various visual layouts, individual class exports, and teacher charts.
            </p>
          </div>
          <div className="bento-visual-container bg-sky-500/5 border border-sky-500/10">
            <div className="formats-previews">
              <div className="format-sheet-mock format-sheet-1"></div>
              <div className="format-sheet-mock format-sheet-2"></div>
              <div className="format-sheet-mock format-sheet-3"></div>
            </div>
          </div>
        </div>

        {/* 7. Lightning Fast */}
        <div className="bento-card bento-card-lightning">
          <div>
            <div className="bento-icon-container bg-gradient-yellow text-white">
              <Zap size={22} />
            </div>
            <h3 className="bento-card-title">Lightning Fast</h3>
            <p className="bento-card-desc">
              Generate highly complex class timetables and availability matrices in seconds.
            </p>
          </div>
          <div className="bento-visual-container bg-amber-500/5 border border-amber-500/10">
            <div className="lightning-gauge-container">
              <div className="lightning-gauge-ring"></div>
              <Zap size={22} className="text-amber-400 filter drop-shadow-[0_0_8px_#eab308]" />
            </div>
          </div>
        </div>

        {/* 8. Precision Scheduling */}
        <div className="bento-card bento-card-precision">
          <div>
            <div className="bento-icon-container bg-gradient-pink text-white">
              <Target size={22} />
            </div>
            <h3 className="bento-card-title">Precision Scheduling</h3>
            <p className="bento-card-desc">
              Optimized resource allocation, lunch/recess constraints, and custom time management.
            </p>
          </div>
          <div className="bento-visual-container bg-pink-500/5 border border-pink-500/10">
            <div className="precision-matrix">
              <div className="matrix-node matrix-node-active mn-1"></div>
              <div className="matrix-node"></div>
              <div className="matrix-node matrix-node-active mn-3"></div>
              <div className="matrix-node"></div>
              <div className="matrix-node matrix-node-active mn-5"></div>
              <div className="matrix-node"></div>
              <div className="matrix-node matrix-node-active mn-2"></div>
              <div className="matrix-node"></div>
              <div className="matrix-node matrix-node-active mn-4"></div>
              <div className="matrix-node"></div>
            </div>
          </div>
        </div>

        {/* 9. Secure Data Storage (Double column on desktop) */}
        <div className="bento-card bento-card-storage lg:col-span-2 lg:flex-row gap-6 items-center">
          <div className="flex-1 flex flex-col justify-between h-full">
            <div>
              <div className="bento-icon-container bg-gradient-slate text-white">
                <Database size={22} />
              </div>
              <h3 className="bento-card-title">Secure Data Storage</h3>
              <p className="bento-card-desc">
                Cloud-based storage sandboxed under Clerk security standards with automatic daily backup and sync.
              </p>
            </div>
            <div className="mt-auto text-xs text-slate-400 font-semibold flex items-center gap-1.5">
              <span>Encrypted database vaults active</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-ping"></span>
            </div>
          </div>
          <div className="w-full lg:w-[280px] shrink-0 h-[120px] bento-visual-container flex items-center justify-center bg-slate-500/5 border border-slate-500/10">
            <div className="secure-db-visual">
              <div className="db-visual-flow">
                <Database size={22} className="text-slate-400" />
                <div className="w-8 h-0.5 border-t border-dashed border-slate-500/30 animate-pulse"></div>
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                </div>
              </div>
              <div className="db-status-badge flex items-center">
                <span className="db-status-pulse"></span>
                <span>Active Sync</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeaturesSection;