import os
import sys

content = '''import { useEffect, useState } from "react";
import {
  Settings,
  Users,
  BookOpen,
  CalendarDays,
  Code2,
  CheckCircle2,
  ChevronDown,
  Layers,
  Database,
  FileSpreadsheet,
  Cpu,
  Zap,
  Github,
  Mail,
  MessageCircle,
  ExternalLink,
  Info,
  ShieldCheck,
  Lightbulb,
  Table,
  UploadCloud,
  FileText,
  AlertTriangle,
  HeartHandshake
} from "lucide-react";
import SideRays from "../components/SideRays";
import BorderGlow from "../components/BorderGlow";

const NAV_SECTIONS = [
  { id: "overview", label: "系统概览与定位", icon: Info },
  { id: "tutorial", label: "保姆级使用教程", icon: BookOpen },
  { id: "excel-samples", label: "Excel 导入规范与样例", icon: FileSpreadsheet },
  { id: "core-logic", label: "底层排课逻辑与算法", icon: Cpu },
  { id: "project-info", label: "作者信息与开源声明", icon: Github },
];

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [copiedContact, setCopiedContact] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      const sections = NAV_SECTIONS.map((s) => document.getElementById(s.id));
      const scrollPos = window.scrollY + 200;

      for (let i = sections.length - 1; i >= 0; i--) {
        const sec = sections[i];
        if (sec && sec.offsetTop <= scrollPos) {
          setActiveSection(NAV_SECTIONS[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard?.writeText(text);
    setCopiedContact(label);
    setTimeout(() => setCopiedContact(""), 2000);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% 0%, #0c1a2e 0%, #030712 60%, #010409 100%)",
        color: "#e2e8f0",
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        position: "relative",
      }}
    >
      {/* 顶部环境光晕 */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "450px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <SideRays
          side="top"
          count={24}
          speed={0.4}
          color="#38bdf8"
          spread={1.2}
          intensity={0.6}
          vertical={false}
        />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: "1280px", margin: "0 auto", padding: "40px 24px 80px" }}>
        
        {/* 页头 Header */}
        <header style={{ textAlign: "center", marginBottom: "48px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 16px",
              borderRadius: "9999px",
              background: "rgba(56, 189, 248, 0.1)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              color: "#38bdf8",
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "16px",
              letterSpacing: "0.05em",
            }}
          >
            <Zap size={14} /> 智能化 · 约束自适应 · 本地离线排课
          </div>
          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 2.8rem)",
              fontWeight: 800,
              background: "linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #38bdf8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: "0 0 16px",
              letterSpacing: "-0.02em",
            }}
          >
            排课调度系统 · 使用手册与技术文档
          </h1>
          <p style={{ fontSize: "16px", color: "#94a3b8", maxWidth: "760px", margin: "0 auto", lineHeight: 1.6 }}>
            欢迎使用中小学/职业院校智能排课系统。本文档提供从基础配置、Excel 模板导入、约束微调到排课算法原理的全流程指南。
          </p>
        </header>

        {/* 主体两栏布局：左侧导航，右侧内容 */}
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "32px", alignItems: "start" }}>
          
          {/* 左侧悬浮导航 */}
          <aside
            style={{
              position: "sticky",
              top: "24px",
              background: "rgba(15, 23, 42, 0.7)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "16px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", padding: "8px 12px", letterSpacing: "0.05em" }}>
              目录导航
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {NAV_SECTIONS.map((sec) => {
                const Icon = sec.icon;
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "none",
                      background: isActive ? "rgba(56, 189, 248, 0.15)" : "transparent",
                      color: isActive ? "#38bdf8" : "#94a3b8",
                      fontSize: "14px",
                      fontWeight: isActive ? 600 : 400,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s",
                      width: "100%",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <Icon size={16} />
                    <span>{sec.label}</span>
                  </button>
                );
              })}
            </nav>

            <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px", paddingLeft: "12px" }}>快速链接</div>
              <a
                href="https://github.com/seventeenlyc/School_TimeTable_Generator"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.03)",
                  color: "#cbd5e1",
                  fontSize: "13px",
                  textDecoration: "none",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Github size={14} /> GitHub 仓库
                </span>
                <ExternalLink size={12} color="#64748b" />
              </a>
            </div>
          </aside>

          {/* 右侧核心内容区 */}
          <main style={{ display: "flex", flexDirection: "column", gap: "40px" }}>

            {/* 1. 系统概览与定位 */}
            <section id="overview">
              <BorderGlow
                borderRadius={16}
                borderColor="rgba(56, 189, 248, 0.4)"
                glowColor="rgba(56, 189, 248, 0.15)"
                style={{ background: "rgba(15, 23, 42, 0.6)", padding: "28px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ padding: "10px", borderRadius: "12px", background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8" }}>
                    <Info size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "#f8fafc" }}>1. 系统概览与核心定位</h2>
                    <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#94a3b8" }}>专为中小学及职业院校设计的智能化本地排课解决方案</p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginTop: "16px" }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "16px" }}>
                    <div style={{ color: "#38bdf8", fontWeight: 600, fontSize: "15px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <ShieldCheck size={16} /> 100% 离线单机安全
                    </div>
                    <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.5, margin: 0 }}>
                      所有教师、班级及课表数据均保存在本地 SQLite 数据库中，无需连接外网，严防学校师生数据泄露。
                    </p>
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "16px" }}>
                    <div style={{ color: "#34d399", fontWeight: 600, fontSize: "15px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Zap size={16} /> 复杂多维约束求解
                    </div>
                    <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.5, margin: 0 }}>
                      完美支持连堂课、固定时间（如班会/升旗）、教师互斥、跨年级授课、教研无课时段等多重严格限制。
                    </p>
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "16px" }}>
                    <div style={{ color: "#a78bfa", fontWeight: 600, fontSize: "15px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Table size={16} /> 现代化交互 & 导出
                    </div>
                    <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.5, margin: 0 }}>
                      支持班级课表/教师课表多视角切换，提供冲突实时高亮、一键 Excel 多表导出与打印优化布局。
                    </p>
                  </div>
                </div>
              </BorderGlow>
            </section>

            {/* 2. 保姆级使用教程 */}
            <section id="tutorial">
              <BorderGlow
                borderRadius={16}
                borderColor="rgba(52, 211, 153, 0.4)"
                glowColor="rgba(52, 211, 153, 0.15)"
                style={{ background: "rgba(15, 23, 42, 0.6)", padding: "28px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ padding: "10px", borderRadius: "12px", background: "rgba(52, 211, 153, 0.12)", color: "#34d399" }}>
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "#f8fafc" }}>2. 保姆级全流程使用教程</h2>
                    <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#94a3b8" }}>只需四步，从零完成全校智能排课</p>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  
                  {/* 步骤 1 */}
                  <div style={{ display: "flex", gap: "16px", background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(56, 189, 248, 0.2)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>
                      1
                    </div>
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#f1f5f9", margin: "0 0 6px" }}>
                        基础配置（周天数 / 每日节次 / 课时划分）
                      </h3>
                      <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: 1.6, margin: "0 0 8px" }}>
                        前往 <strong>「基础设置」</strong>，设置每周工作日（默认 5 天），上午节次（如 4 节）、下午节次（如 4 节）及晚自习。系统会自动生成全校的时间槽矩阵（例：5天 × 8节 = 40 课时/周）。
                      </p>
                      <div style={{ display: "inline-block", background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "6px", padding: "4px 10px", fontSize: "12px", color: "#7dd3fc" }}>
                        💡 提示：修改每日总节次会重置课时矩阵，请优先最先配置此项。
                      </div>
                    </div>
                  </div>

                  {/* 步骤 2 */}
                  <div style={{ display: "flex", gap: "16px", background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(52, 211, 153, 0.2)", color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>
                      2
                    </div>
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#f1f5f9", margin: "0 0 6px" }}>
                        导入/录入数据（教师名单与课程要求）
                      </h3>
                      <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: 1.6, margin: "0 0 8px" }}>
                        排课所需的核心数据分为两部分：
                      </p>
                      <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", color: "#94a3b8", lineHeight: 1.6 }}>
                        <li><strong>教师名单</strong>：录入全校任课教师姓名、班主任担任情况及主教学科。</li>
                        <li><strong>课程要求</strong>：录入每个班级的各科目任课教师、教室、周总课时、连堂要求以及固定时间规则。</li>
                      </ul>
                      <p style={{ fontSize: "13px", color: "#6ee7b7", margin: "8px 0 0" }}>
                        ⚡ 强烈建议使用 <strong>「Excel 批量导入」</strong> 功能（详见下方 Excel 规范）。
                      </p>
                    </div>
                  </div>

                  {/* 步骤 3 */}
                  <div style={{ display: "flex", gap: "16px", background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.2)", color: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>
                      3
                    </div>
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#f1f5f9", margin: "0 0 6px" }}>
                        一键智能排课与冲突检测
                      </h3>
                      <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
                        在 <strong>「排课工作台」</strong> 点击 <strong>「开始自动排课」</strong>。系统引擎将先锁定所有硬约束（固定课时、连堂、教师无课时段），随后运用启发式算法和回溯搜索对剩余课时进行全局填充与均衡优化。排课完成后即时展示成功率及冲突日志。
                      </p>
                    </div>
                  </div>

                  {/* 步骤 4 */}
                  <div style={{ display: "flex", gap: "16px", background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(167, 139, 250, 0.2)", color: "#c084fc", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>
                      4
                    </div>
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#f1f5f9", margin: "0 0 6px" }}>
                        人工微调、多视角查看与 Excel 导出
                      </h3>
                      <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: 1.6, margin: "0 0 8px" }}>
                        排课生成后可随时在课表看板中进行拖拽交换或点击调整，系统会实时校验教师与教室时间冲突。确认无误后，点击 <strong>「导出 Excel」</strong> 即可生成全校总表、各班分表及各教师个人课表。
                      </p>
                    </div>
                  </div>

                </div>
              </BorderGlow>
            </section>

            {/* 3. Excel 导入规范与样例 */}
            <section id="excel-samples">
              <BorderGlow
                borderRadius={16}
                borderColor="rgba(245, 158, 11, 0.4)"
                glowColor="rgba(245, 158, 11, 0.15)"
                style={{ background: "rgba(15, 23, 42, 0.6)", padding: "28px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ padding: "10px", borderRadius: "12px", background: "rgba(245, 158, 11, 0.12)", color: "#fbbf24" }}>
                    <FileSpreadsheet size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "#f8fafc" }}>3. Excel 导入规范与标准样例</h2>
                    <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#94a3b8" }}>支持标准 .xlsx 格式文件一键解析导入，严格对应业务表头结构</p>
                  </div>
                </div>

                {/* 样例 1: 课程要求.xlsx */}
                <div style={{ marginBottom: "28px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ padding: "4px 8px", background: "#0284c7", color: "#fff", borderRadius: "6px", fontSize: "12px", fontWeight: 700 }}>
                        文件一
                      </span>
                      <strong style={{ fontSize: "16px", color: "#e2e8f0" }}>课程要求.xlsx</strong>
                      <span style={{ fontSize: "13px", color: "#64748b" }}>（班级排课核心需求表）</span>
                    </div>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>表头必须完全一致（支持 7 列）</span>
                  </div>

                  <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(0,0,0,0.2)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "rgba(56, 189, 248, 0.12)", color: "#7dd3fc", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                          <th style={{ padding: "10px 14px" }}>班级</th>
                          <th style={{ padding: "10px 14px" }}>科目</th>
                          <th style={{ padding: "10px 14px" }}>教师</th>
                          <th style={{ padding: "10px 14px" }}>教室</th>
                          <th style={{ padding: "10px 14px" }}>周课时</th>
                          <th style={{ padding: "10px 14px" }}>连堂课时</th>
                          <th style={{ padding: "10px 14px" }}>固定时间（星期*节次）</th>
                        </tr>
                      </thead>
                      <tbody style={{ color: "#cbd5e1" }}>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 600, color: "#f8fafc" }}>1班</td>
                          <td style={{ padding: "10px 14px" }}>语文</td>
                          <td style={{ padding: "10px 14px" }}>小明</td>
                          <td style={{ padding: "10px 14px" }}>1班教室</td>
                          <td style={{ padding: "10px 14px" }}>6</td>
                          <td style={{ padding: "10px 14px" }}>0</td>
                          <td style={{ padding: "10px 14px", color: "#94a3b8" }}>/</td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 600, color: "#f8fafc" }}>1班</td>
                          <td style={{ padding: "10px 14px" }}>数学</td>
                          <td style={{ padding: "10px 14px" }}>小红</td>
                          <td style={{ padding: "10px 14px" }}>1班教室</td>
                          <td style={{ padding: "10px 14px" }}>7</td>
                          <td style={{ padding: "10px 14px", color: "#34d399", fontWeight: 600 }}>1 (表示排1次2节连堂)</td>
                          <td style={{ padding: "10px 14px", color: "#94a3b8" }}>/</td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 600, color: "#f8fafc" }}>1班</td>
                          <td style={{ padding: "10px 14px" }}>英语</td>
                          <td style={{ padding: "10px 14px" }}>小刚</td>
                          <td style={{ padding: "10px 14px" }}>1班教室</td>
                          <td style={{ padding: "10px 14px" }}>6</td>
                          <td style={{ padding: "10px 14px" }}>0</td>
                          <td style={{ padding: "10px 14px", color: "#94a3b8" }}>/</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "10px 14px", fontWeight: 600, color: "#f8fafc" }}>1班</td>
                          <td style={{ padding: "10px 14px" }}>班会</td>
                          <td style={{ padding: "10px 14px" }}>小红</td>
                          <td style={{ padding: "10px 14px" }}>1班教室</td>
                          <td style={{ padding: "10px 14px" }}>1</td>
                          <td style={{ padding: "10px 14px" }}>0</td>
                          <td style={{ padding: "10px 14px", color: "#fbbf24", fontWeight: 600 }}>1*8 (周一第8节)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: "10px", background: "rgba(255,255,255,0.02)", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", color: "#94a3b8", lineHeight: 1.5 }}>
                    <strong style={{ color: "#f1f5f9" }}>字段格式说明：</strong>
                    <ul style={{ margin: "6px 0 0", paddingLeft: "20px" }}>
                      <li><strong>连堂课时</strong>：填数字（如 <code>1</code> 表示安排 1 次两节连堂，<code>0</code> 或 <code>/</code> 表示不连堂）。</li>
                      <li><strong>固定时间</strong>：格式为 <code>星期*节次</code>（例如 <code>1*8</code> 表示周一第8节，<code>5*1</code> 表示周五第1节；无固定时间填 <code>/</code> 或留空）。</li>
                    </ul>
                  </div>
                </div>

                {/* 样例 2: 教师.xlsx */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ padding: "4px 8px", background: "#059669", color: "#fff", borderRadius: "6px", fontSize: "12px", fontWeight: 700 }}>
                        文件二
                      </span>
                      <strong style={{ fontSize: "16px", color: "#e2e8f0" }}>教师.xlsx</strong>
                      <span style={{ fontSize: "13px", color: "#64748b" }}>（教师档案与班主任映射表）</span>
                    </div>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>表头必须完全一致（支持 3 列）</span>
                  </div>

                  <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(0,0,0,0.2)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "rgba(52, 211, 153, 0.12)", color: "#a7f3d0", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                          <th style={{ padding: "10px 14px" }}>教师姓名</th>
                          <th style={{ padding: "10px 14px" }}>班主任班级</th>
                          <th style={{ padding: "10px 14px" }}>主教学科</th>
                        </tr>
                      </thead>
                      <tbody style={{ color: "#cbd5e1" }}>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 600, color: "#f8fafc" }}>语文老师01</td>
                          <td style={{ padding: "10px 14px", color: "#38bdf8" }}>1班</td>
                          <td style={{ padding: "10px 14px" }}>语文</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "10px 14px", fontWeight: 600, color: "#f8fafc" }}>数学老师02</td>
                          <td style={{ padding: "10px 14px", color: "#38bdf8" }}>14班</td>
                          <td style={{ padding: "10px 14px" }}>数学</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: "10px", background: "rgba(255,255,255,0.02)", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", color: "#94a3b8", lineHeight: 1.5 }}>
                    <strong style={{ color: "#f1f5f9" }}>字段格式说明：</strong>
                    <ul style={{ margin: "6px 0 0", paddingLeft: "20px" }}>
                      <li><strong>班主任班级</strong>：若该教师担任班主任，填写具体班级名称（如 <code>1班</code>）；非班主任填 <code>/</code> 或留空。</li>
                      <li><strong>主教学科</strong>：教师主修或主要负责课程（便于统筹教研时间约束）。</li>
                    </ul>
                  </div>
                </div>

              </BorderGlow>
            </section>

            {/* 4. 底层逻辑与排课算法 */}
            <section id="core-logic">
              <BorderGlow
                borderRadius={16}
                borderColor="rgba(167, 139, 250, 0.4)"
                glowColor="rgba(167, 139, 250, 0.15)"
                style={{ background: "rgba(15, 23, 42, 0.6)", padding: "28px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ padding: "10px", borderRadius: "12px", background: "rgba(167, 139, 250, 0.12)", color: "#c084fc" }}>
                    <Cpu size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "#f8fafc" }}>4. 底层排课逻辑与算法原理</h2>
                    <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#94a3b8" }}>理解调度引擎如何将数百节课程精准排入课表时间槽</p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  
                  {/* 硬约束 */}
                  <div style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "12px", padding: "18px" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#f87171", margin: "0 0 10px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <AlertTriangle size={18} /> 硬约束（Hard Constraints · 必须 100% 满足）
                    </h3>
                    <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#cbd5e1", lineHeight: 1.7 }}>
                      <li><strong>时间槽唯一性</strong>：同一班级在同一节次绝不能排入两门及以上课程。</li>
                      <li><strong>教师无冲突</strong>：同一教师在同一节次只能给一个班级上课。</li>
                      <li><strong>教室资源互斥</strong>：专用功能室（如微机室、实验室）在同时间段容量有限。</li>
                      <li><strong>固定节次锁定</strong>：固定时间要求（如周一第8节班会）优先直接落位锁定。</li>
                      <li><strong>连堂跨半天禁止</strong>：两节连堂不可横跨上午最后一节与下午第一节。</li>
                    </ul>
                  </div>

                  {/* 软约束 */}
                  <div style={{ background: "rgba(56, 189, 248, 0.05)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "12px", padding: "18px" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#38bdf8", margin: "0 0 10px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Lightbulb size={18} /> 软约束与优化目标（Soft Goals · 尽量最优化）
                    </h3>
                    <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#cbd5e1", lineHeight: 1.7 }}>
                      <li><strong>学科周离散度</strong>：主科（语数英）尽量均匀分布于周一至周五，避免一天排多节或连续几天无课。</li>
                      <li><strong>教师工作量负荷</strong>：单日课时尽量均衡，避免教师单日连续授课超过 4 节。</li>
                      <li><strong>早下午精力分布</strong>：主修高思维负荷课程优先置于上午，体育/艺术等优先适度置于下午。</li>
                      <li><strong>教研活动保护</strong>：同教研组教师尽量在教研时段避开排课。</li>
                    </ul>
                  </div>

                </div>

                {/* 求解算法简述 */}
                <div style={{ marginTop: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "18px" }}>
                  <h4 style={{ fontSize: "15px", fontWeight: 600, color: "#f1f5f9", margin: "0 0 8px" }}>核心求解算法：CSP 约束满足 + 启发式回溯搜索</h4>
                  <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
                    排课问题本质属于 NP-Hard 的组合优化问题。系统将“班级-科目-教师-课时”抽象为待赋值变量（Variables），将“时间槽-教室”作为取值域（Domain）。求解器先根据<strong>最少剩余值启发式（MRV）</strong>优先安排约束最紧苛的课程（如固定课、连堂课），再结合<strong>前向检验（Forward Checking）</strong>实时剪枝冲突空间，在遇到死锁时执行自适应回溯或局部禁忌搜索交换，实现数秒内完成数十个班级的课表求解。
                  </p>
                </div>
              </BorderGlow>
            </section>

            {/* 5. 作者信息与开源声明 */}
            <section id="project-info">
              <BorderGlow
                borderRadius={16}
                borderColor="rgba(236, 72, 153, 0.4)"
                glowColor="rgba(236, 72, 153, 0.15)"
                style={{ background: "rgba(15, 23, 42, 0.6)", padding: "28px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ padding: "10px", borderRadius: "12px", background: "rgba(236, 72, 153, 0.12)", color: "#f472b6" }}>
                    <HeartHandshake size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "#f8fafc" }}>5. 作者信息与开源项目声明</h2>
                    <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#94a3b8" }}>欢迎技术交流、提出 Issue 或贡献 PR 代码</p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
                  
                  {/* 作者名片卡 */}
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
                      <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "linear-gradient(135deg, #ec4899, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: 800, color: "#fff" }}>
                        拾
                      </div>
                      <div>
                        <div style={{ fontSize: "17px", fontWeight: 700, color: "#f8fafc" }}>拾柒 (seventeenlyc)</div>
                        <div style={{ fontSize: "13px", color: "#94a3b8" }}>深圳大学 · 全栈开发者</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                      
                      {/* 微信 */}
                      <div
                        onClick={() => copyToClipboard("z13435142650", "微信")}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.05)",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: "8px", color: "#cbd5e1" }}>
                          <MessageCircle size={15} color="#34d399" /> 微信：<code style={{ color: "#6ee7b7" }}>z13435142650</code>
                        </span>
                        <span style={{ fontSize: "11px", color: copiedContact === "微信" ? "#34d399" : "#64748b" }}>
                          {copiedContact === "微信" ? "已复制 ✓" : "点击复制"}
                        </span>
                      </div>

                      {/* QQ 邮箱 */}
                      <div
                        onClick={() => copyToClipboard("2166652427@qq.com", "QQ邮箱")}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.05)",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: "8px", color: "#cbd5e1" }}>
                          <Mail size={15} color="#38bdf8" /> 邮箱：<code style={{ color: "#7dd3fc" }}>2166652427@qq.com</code>
                        </span>
                        <span style={{ fontSize: "11px", color: copiedContact === "QQ邮箱" ? "#38bdf8" : "#64748b" }}>
                          {copiedContact === "QQ邮箱" ? "已复制 ✓" : "点击复制"}
                        </span>
                      </div>

                      {/* 学术邮箱 */}
                      <div
                        onClick={() => copyToClipboard("2025150194@mails.szu.edu.cn", "学术邮箱")}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.05)",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: "8px", color: "#cbd5e1" }}>
                          <Mail size={15} color="#c084fc" /> 学术邮箱：<code style={{ color: "#d8b4fe" }}>2025150194@mails.szu.edu.cn</code>
                        </span>
                        <span style={{ fontSize: "11px", color: copiedContact === "学术邮箱" ? "#c084fc" : "#64748b" }}>
                          {copiedContact === "学术邮箱" ? "已复制 ✓" : "点击复制"}
                        </span>
                      </div>

                    </div>
                  </div>

                  {/* 仓库与协议说明 */}
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "#f8fafc", marginBottom: "8px" }}>
                        项目开源仓库与声明
                      </div>
                      <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.6, margin: "0 0 12px" }}>
                        本项目旨在解决中小学校排课复杂、繁琐的问题，提供开箱即用、零数据上云的现代化排课工具。采用 MIT 开源协议发布，允许自由修改与商业二次开发。
                      </p>
                    </div>

                    <a
                      href="https://github.com/seventeenlyc/School_TimeTable_Generator"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        padding: "12px 18px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #1e293b, #0f172a)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        color: "#fff",
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: "14px",
                        boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
                      }}
                    >
                      <Github size={18} />
                      <span>访问 GitHub 个人仓库主页</span>
                      <ExternalLink size={14} color="#94a3b8" />
                    </a>
                  </div>

                </div>
              </BorderGlow>
            </section>

          </main>
        </div>

        {/* 底部版权 */}
        <footer style={{ marginTop: "64px", textAlign: "center", fontSize: "13px", color: "#64748b", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "24px" }}>
          <div>© 2025-2026 拾柒 (seventeenlyc) · School TimeTable Generator. Released under the MIT License.</div>
        </footer>

      </div>
    </div>
  );
}
'''

with open("使用说明-独立副本/GuidePage.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("GuidePage.jsx updated successfully!")
