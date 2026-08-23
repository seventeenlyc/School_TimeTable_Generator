import { useEffect, useState } from "react";
import {
  BookOpen,
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
          speed={0.4}
          rayColor1="#38bdf8"
          rayColor2="#0ea5e9"
          spread={1.2}
          intensity={0.6}
          origin="top-right"
          opacity={0.6}
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
                      所有教师、班级及课表数据均保存为本机 JSON 数据文件；系统单机离线运行，无需连接外网。
                    </p>
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "16px" }}>
                    <div style={{ color: "#34d399", fontWeight: 600, fontSize: "15px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Zap size={16} /> 复杂多维约束求解
                    </div>
                    <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.5, margin: 0 }}>
                      自动排课会同时满足课程周课时、固定节次、教师不可用时段，以及班级、教师和教室不冲突等限制；自习不排在第一节、也不连续两节；走班课程会同步占用关联班级。
                    </p>
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "16px" }}>
                    <div style={{ color: "#a78bfa", fontWeight: 600, fontSize: "15px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Table size={16} /> 现代化交互 & 导出
                    </div>
                    <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.5, margin: 0 }}>
                      支持班级课表与教师课表切换；可导出一个包含全部班级工作表的 Excel 文件，并可在保存新版本时进行校验。
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
                        基础配置（固定周一至周五 / 每日节次）
                      </h3>
                      <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: 1.6, margin: "0 0 8px" }}>
                        前往 <strong>「基础数据」→「系统设置」</strong>，确认固定的周一至周五工作制，并设置每日节数。系统会按“5 天 × 每日节数”生成可排课的时间槽。
                      </p>
                      <div style={{ display: "inline-block", background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "6px", padding: "4px 10px", fontSize: "12px", color: "#7dd3fc" }}>
                        💡 提示：先完成系统设置，再录入课程要求和固定节次，能减少后续修改。
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
                        <li><strong>课程要求</strong>：录入每个班级的各科目任课教师、教室、周课时和固定时间规则。</li>
                      </ul>
                      <p style={{ fontSize: "13px", color: "#6ee7b7", margin: "8px 0 0" }}>
                        ⚡ 可在 <strong>「基础数据」</strong> 中手工录入，或点击 <strong>「导入 Excel」→「解析并预览」→「应用到草稿」</strong>，最后点击保存基础数据。
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
                        前往 <strong>「生成课表」</strong>，填写课表名称和生效日期后点击 <strong>「生成预览」</strong>。系统会在候选课表中满足固定节次、教师不可用时段、班级/教师/教室互斥等约束；预览确认后点击 <strong>「确认保存」</strong>。
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
                        在班级或教师视图查看课表。需要修改时，进入编辑页，先点击起始课节，再点击目标课节即可交换或移动课程；走班课会同步移动。保存时会生成新版本并校验。点击 <strong>「导出全部班级课表」</strong> 可生成一个按班级分工作表的 Excel 文件。
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
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>首个非空工作表必须包含以下 7 个表头</span>
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
                          <td style={{ padding: "10px 14px", color: "#94a3b8" }}>0</td>
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
                      <li><strong>连堂课时</strong>：这是兼容旧模板的保留列，表头不能删除；当前版本会忽略该列的值，新导入课程均按单节处理。</li>
                      <li><strong>固定时间（星期*节次）</strong>：格式为 <code>星期*节次</code>（例如 <code>1*8</code> 表示周一第 8 节，<code>5*1</code> 表示周五第 1 节；无固定时间填 <code>/</code> 或留空）。</li>
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
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>首个非空工作表必须包含以下 3 个表头</span>
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
                      <li><strong>班主任班级</strong>：若该教师担任班主任，填写具体班级名称（如 <code>1班</code>）；非班主任请留空。</li>
                      <li><strong>主教学科</strong>：填写教师的主要任教学科。导入时会将该学科加入教师资质；课程要求中的任课教师也会自动获得对应学科资质。</li>
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
                      <li><strong>教师不可用时段</strong>：教师在基础数据中设置的禁排时间不会被安排课程。</li>
                      <li><strong>走班同步</strong>：同一走班课程会在关联班级的同一时间段同步安排。</li>
                      <li><strong>每日核心课程</strong>：完整录入语文、数学、英语的班级，每个工作日三科都至少安排一节；语文、英语每天各一节，只有数学可在同一天安排两节。</li>
                      <li><strong>选科均衡</strong>：物理、化学、生物、历史、政治、地理（含走班课程）同一科目每天最多安排一节。</li>
                    </ul>
                  </div>

                  {/* 软约束 */}
                  <div style={{ background: "rgba(56, 189, 248, 0.05)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "12px", padding: "18px" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#38bdf8", margin: "0 0 10px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Lightbulb size={18} /> 软约束与优化目标（Soft Goals · 尽量最优化）
                    </h3>
                    <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#cbd5e1", lineHeight: 1.7 }}>
                      <li><strong>班级空档</strong>：尽量减少同一班级一天内两节课之间出现的空课节。</li>
                      <li><strong>班主任首节</strong>：当班主任教授本班主教学科时，尽量安排在每天第一节。</li>
                    </ul>
                  </div>

                </div>

                {/* 求解算法简述 */}
                <div style={{ marginTop: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "18px" }}>
                  <h4 style={{ fontSize: "15px", fontWeight: 600, color: "#f1f5f9", margin: "0 0 8px" }}>核心求解算法：OR-Tools CP-SAT 约束优化</h4>
                  <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
                    系统使用 Google OR-Tools 的 CP-SAT 求解器，将“课程要求 × 日期 × 节次”建模为布尔决策变量，并把周课时、固定节次、资源互斥、不可用时段等条件写入约束模型。求解器在最多 30 秒内搜索可行方案，并以班级空档和班主任首节等目标进行优化；若无法生成，会返回不可行诊断而不是生成冲突课表。
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
                        本项目旨在解决中小学校排课复杂、繁琐的问题，提供开箱即用、零数据上云的现代化排课工具。采用 CC BY-NC 4.0（署名—非商业性使用）协议发布：允许在署名、标注修改并附上许可链接的前提下进行非商业性分享与演绎；商业使用须另行获得授权。
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
          <div>© 2025-2026 拾柒 (seventeenlyc) · School TimeTable Generator. Released under CC BY-NC 4.0.</div>
        </footer>

      </div>
    </div>
  );
}
