import { useEffect, useState } from "react";
import {
  Settings,
  Users,
  BookOpen,
  CalendarDays,
  Code2,
  BarChart2,
  CheckCircle2,
  ChevronDown,
  Layers,
  Bot,
  Database,
  CalendarRange,
} from "lucide-react";
import SideRays from "../components/SideRays";
import BorderGlow from "../components/BorderGlow";

const NAV_SECTIONS = [
  { id: "tech-stack", label: "技术架构" },
  { id: "inputs", label: "输入数据" },
  { id: "workflow", label: "工作流程" },
  { id: "logic", label: "排课算法逻辑" },
  { id: "agent-rules", label: "Agent 智能调代课" },
  { id: "post-gen", label: "排课后与运维" },
];

const TECH_STACK = [
  { label: "前端框架", value: "React + Tailwind CSS" },
  { label: "运行架构", value: "单机离线运行（免登录、零云端依赖）" },
  { label: "后端服务", value: "FastAPI (Python) · 本地 127.0.0.1:8001" },
  { label: "数据存储", value: "本机 JSON 持久化（带自动版本备份机制）" },
  { label: "排课引擎", value: "Google OR-Tools · CP-SAT 约束求解器" },
  { label: "智能调代课", value: "确定性规则引擎 + Agent 智能决策助手" },
];

const INPUT_CARDS = [
  {
    icon: Settings,
    title: "基础设置",
    summary: "课表名称、固定周一到周六教学天数、每日节次与真实生效日期。",
    detail:
      "配置课表核心结构：固定周一到周六教学周期、每日节次总数（1-20节），以及配置真实生效起始日期；数据完全保存在本机 JSON 文件中，无需账号登录。",
  },
  {
    icon: Users,
    title: "班级与走班",
    summary: "行政班配置与同步走班组（如1班/2班地理政治同步走班）。",
    detail:
      "定义所有参与排课的班级与走班组合。典型示例：高一(1)班与高一(2)班配置地理、政治同步走班，在相同时间段内由对应走班教师并行授课且互不冲突。",
  },
  {
    icon: BookOpen,
    title: "教师与课程",
    summary: "教师姓名、任教学科与班级、班主任归属、专用实验连堂。",
    detail:
      "精确指定每位教师的姓名、任教学科、班主任班级归属，以及需占用专用功能室连续排课的实验/实训课程配置。",
  },
  {
    icon: CalendarDays,
    title: "周课时要求",
    summary: "各班级每门学科每周需安排的标准课时数。",
    detail:
      "精确设定每个班级中每门课程的周课时节数。CP-SAT 约束求解器将严格执行该数量，杜绝课时超额或缺漏。",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "本地数据录入与配置",
    description:
      "在前端交互界面中录入排课参数、班级与走班关系、教师及周课时需求，点击保存后写入本机 JSON 文件。",
  },
  {
    step: "02",
    title: "结构校验与约束构建",
    description:
      "本地 FastAPI 后端对提交参数进行一致性与完整性校验，构建教师-学科-时段的运筹优化约束模型。",
  },
  {
    step: "03",
    title: "教师与走班关系拓扑",
    description:
      "后端构建行政班与走班组的拓扑关系矩阵，精准锁定走班同步节次与教师可用时段求解空间。",
  },
  {
    step: "04",
    title: "CP-SAT 约束求解计算",
    description:
      "基于 Google OR-Tools CP-SAT 求解器综合应用硬约束与优化目标，生成满足硬约束的可行课表并按软目标优化求解。",
  },
  {
    step: "05",
    title: "多视角课表生成",
    description:
      "自动生成“班级课表”与“教师课表”全景视图，支持按周一至周六时段与真实生效日期动态查看与比对。",
  },
  {
    step: "06",
    title: "Agent 智能调代课决策",
    description:
      "遇教师繁忙或突发缺勤时，Agent 自动评估同科代课与班内换课方案，生成完整对比预览供人工确认。",
  },
  {
    step: "07",
    title: "确认应用与本地备份",
    description:
      "任何调代课方案必须经用户明确点击确认后才会持久化应用，并自动记录版本与生成本地数据备份。",
  },
];

const CONSTRAINTS = [
  {
    title: "单时段教师唯一性规则",
    description: "同一时段内，一位教师只能被安排到一个班级（或一组同步走班）授课，杜绝撞课冲突。",
  },
  {
    title: "周课时精准匹配",
    description:
      "严格执行各班级每门课程设定的周总课时要求，不偏差、不少排、不多排。",
  },
  {
    title: "学科每日节次上限",
    description:
      "同一班级同一门普通学科每天最多安排两节，防止课程过于集中单调，保障教学规律。",
  },
  {
    title: "实验课程连堂安排",
    description:
      "实验/实训类学科自动锁定为连续两节连堂排课，并自动协调专用实验室资源冲突。",
  },
  {
    title: "班主任首节课优先",
    description:
      "班主任所教授的主要学科优先安排在对应班级每日的第一节课，便于早自习和日常班级管理。",
  },
  {
    title: "同步走班协同约束",
    description:
      "支持1班/2班地理政治等同步走班，确保对应班级在同一节次同步开展走班教学，教师资源精准对齐。",
  },
];

const AGENT_RULES = [
  {
    icon: Bot,
    title: "教师繁忙：班内换课优先",
    description:
      "当教师临时因事繁忙时，Agent 优先在同一行政班内寻找合适学科进行对调（班内换课）；若无法对调，再推荐同科其他教师代课。",
  },
  {
    icon: Users,
    title: "教师缺勤：同科代课优先",
    description:
      "当教师临时缺勤请假时，Agent 优先推荐同学科空闲教师代课；若无可用代课教师，再寻找波及范围最小的跨节次调课方案。",
  },
  {
    icon: Layers,
    title: "走班课程：代课优先原则",
    description:
      "对于 1 班 / 2 班地理政治等同步走班课程，因涉及多班级联动，Agent 优先采用同科代课方案，最大限度避免破坏整体走班节奏。",
  },
  {
    icon: CalendarRange,
    title: "长期缺勤：版本化持久演进",
    description:
      "长期缺勤将生成全新生效课表版本，教师恢复后系统不自动回滚旧课表，需根据教务实际情况明确确认后再行调整。",
  },
  {
    icon: CheckCircle2,
    title: "严格双重把关：方案预览与人工确认",
    description:
      "Agent 给出的任何调代课推荐仅作为方案预览呈现，展示影响节次与冲突比对，必须经教务人员手动确认后方可写入生效。",
  },
];

const POST_GEN = [
  {
    icon: Code2,
    title: "交互式调课与冲突校验",
    description:
      "支持在课表视图中通过前端两次点击交换或移动微调节次，保存时由后端进行完整校验教师撞课、班级重课及走班冲突，确保调整合规。",
  },
  {
    icon: Database,
    title: "本机 JSON 存储与备份恢复",
    description:
      "所有基础配置、排课方案与调代课记录均保存在本机 JSON 文件中；支持本地配置备份与历史恢复，恢复前提供明确二次确认。",
  },
  {
    icon: BarChart2,
    title: "课表分布与统计分析",
    description:
      "直观呈现教师课时负荷分布、周一至周六教学节次统计与学科覆盖度，辅助教务人员全景把控排课均衡度与空缺时段。",
  },
];

function AccordionCard({ icon: CardIcon, title, summary, detail }) {
  const [open, setOpen] = useState(false);
  return (
    <BorderGlow
      borderRadius={16}
      backgroundColor={open ? "rgba(87, 241, 219, 0.05)" : "rgba(10, 18, 36, 0.4)"}
      glowColor="170 80 50"
      className="hover:scale-[1.005]"
      style={{
        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        cursor: "pointer",
        userSelect: "none",
        border: `1px solid ${open ? "rgba(87, 241, 219, 0.22)" : "rgba(255, 255, 255, 0.06)"}`,
      }}
      onClick={() => setOpen((v) => !v)}
    >
      <div style={{ padding: 20, display: "flex", alignItems: "flex-start", gap: 16, width: "100%", height: "100%" }}>
        <div
          style={{
            flexShrink: 0,
            width: 40,
            height: 40,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: open ? "#57f1db" : "rgba(87, 241, 219, 0.08)",
            color: open ? "#051424" : "#57f1db",
            transition: "all 0.25s ease"
          }}
        >
          {CardIcon && <CardIcon size={18} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 750, color: "#fff", fontSize: 15.5, margin: 0 }}>{title}</p>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 3, margin: 0 }}>{summary}</p>
          {open && (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 13, color: "#d4e4fa", lineHeight: 1.6, margin: 0 }}>{detail}</p>
            </div>
          )}
        </div>
        <ChevronDown
          size={16}
          style={{
            flexShrink: 0,
            marginTop: 4,
            color: open ? "#57f1db" : "rgba(255,255,255,0.25)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.25s ease"
          }}
        />
      </div>
    </BorderGlow>
  );
}

function Section({ id, label, children }) {
  return (
    <section id={id} style={{ scrollMarginTop: 96, paddingTop: 48 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <span style={{ fontSize: 11, fontWeight: 850, letterSpacing: "0.15em", color: "#57f1db", textTransform: "uppercase" }}>
          {label}
        </span>
        <div style={{ flex: 1, height: 1, background: "rgba(255, 255, 255, 0.04)" }} />
      </div>
      {children}
    </section>
  );
}

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState("tech-stack");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse 100% 60% at 15% 10%, #081225 0%, #030814 60%, #02050b 100%)",
        color: "#d4e4fa",
        fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
        overflowX: "hidden",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 0, right: 0, width: "100%", height: "100%", minHeight: "100vh", overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <SideRays
          speed={1.0}
          rayColor1="#57f1db"
          rayColor2="#7c3aed"
          intensity={1.2}
          spread={2.0}
          origin="top-right"
          tilt={-10}
          saturation={1.5}
          blend={0.65}
          falloff={1.5}
          opacity={0.35}
        />
      </div>
      {/* Hero */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(5, 12, 24, 0.25)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "100px 24px 40px" }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: "#57f1db", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12, fontFamily: "monospace" }}>
            [ 系统使用指南 ]
          </p>
          <h1 style={{ fontSize: "clamp(2rem, 4.5vw, 2.75rem)", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", margin: "0 0 16px", lineHeight: 1.15 }}>
            排课调度系统工作原理
          </h1>
          <p style={{ fontSize: 15, color: "#64748b", maxWidth: 640, lineHeight: 1.6, margin: 0 }}>
            全方位解析系统如何智能生成最优学校课程表 —— 从本地基础数据录入、约束规划求解到 Agent 调代课决策与本地数据运维全流程说明。
          </p>
          <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {NAV_SECTIONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                style={{
                  padding: "6px 14px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.02)",
                  color: "#d4e4fa",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseOver={e => { e.target.style.borderColor="#57f1db"; e.target.style.color="#57f1db"; e.target.style.background="rgba(87,241,219,0.04)"; }}
                onMouseOut={e => { e.target.style.borderColor="rgba(255,255,255,0.08)"; e.target.style.color="#d4e4fa"; e.target.style.background="rgba(255,255,255,0.02)"; }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px 80px", display: "flex", gap: 48 }}>
        {/* Sticky nav sidebar */}
        <aside style={{ width: 180, flexShrink: 0, paddingTop: 48 }} className="max-lg:hidden">
          <div style={{ position: "sticky", top: 100 }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 16 }}>
              本页导航
            </p>
            <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {NAV_SECTIONS.map(({ id, label }) => {
                const isActive = activeSection === id;
                return (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      fontSize: 13,
                      fontWeight: 700,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      background: isActive ? "rgba(87, 241, 219, 0.08)" : "transparent",
                      color: isActive ? "#57f1db" : "rgba(212, 228, 250, 0.5)",
                      transition: "all 0.2s"
                    }}
                    onMouseOver={e => { if (!isActive) e.target.style.color="#57f1db"; }}
                    onMouseOut={e => { if (!isActive) e.target.style.color="rgba(212, 228, 250, 0.5)"; }}
                  >
                    {label}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {/* Tech Stack */}
          <Section id="tech-stack" label="技术架构">
            <p style={{ color: "#64748b", marginBottom: 20, fontSize: 14.5, lineHeight: 1.6 }}>
              平台基于现代生产级技术栈构建 —— 纯单机离线运行架构，无需登录，数据全部持久化于本地。
            </p>
            <BorderGlow
              borderRadius={16}
              backgroundColor="rgba(10, 18, 36, 0.35)"
              glowColor="170 80 50"
              style={{
                border: "1px solid rgba(255,255,255,0.06)",
                overflow: "hidden"
              }}
            >
              <div style={{ width: "100%" }}>
                {TECH_STACK.map(({ label, value }, i) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 20px",
                      borderBottom: i < TECH_STACK.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none"
                    }}
                  >
                    <span style={{ fontSize: 13.5, color: "rgba(255,255,255,0.45)", fontWeight: 700 }}>{label}</span>
                    <span style={{ fontSize: 13.5, color: "#fff", fontWeight: 800 }}>{value}</span>
                  </div>
                ))}
              </div>
            </BorderGlow>
          </Section>

          {/* Inputs */}
          <Section id="inputs" label="输入数据">
            <p style={{ color: "#64748b", marginBottom: 20, fontSize: 14.5, lineHeight: 1.6 }}>
              排课所需的基础数据包含四个核心维度。数据均保存在本地 JSON 存储中，点击卡片可展开详情。
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              {INPUT_CARDS.map((card) => (
                <AccordionCard key={card.title} {...card} />
              ))}
            </div>
          </Section>

          {/* Workflow */}
          <Section id="workflow" label="工作流程">
            <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14.5, lineHeight: 1.6 }}>
              从本地参数配置到课表生成与调代课运维，系统严格遵循标准化、清晰高效的 7 步处理流水线。
            </p>
            <div style={{ position: "relative", padding: "10px 0" }}>
              {/* Spine line */}
              <div style={{ position: "absolute", left: 22, top: 24, bottom: 24, width: 2, background: "linear-gradient(to bottom, #57f1db, #a78bfa)" }} />
              <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {WORKFLOW_STEPS.map(({ step, title, description }, i) => (
                  <li key={step} style={{ display: "flex", gap: 20, position: "relative" }}>
                    <div style={{
                      flexShrink: 0,
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "#030814",
                      border: "2px solid #57f1db",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 10,
                      boxShadow: "0 0 10px rgba(87,241,219,0.2)"
                    }}>
                      <span style={{ fontSize: 11, fontStyle: "normal", fontWeight: 850, color: "#57f1db", fontFamily: "monospace" }}>{step}</span>
                    </div>
                    <div style={{ flex: 1, paddingBottom: i === WORKFLOW_STEPS.length - 1 ? 0 : 28 }}>
                      <p style={{ fontWeight: 800, color: "#fff", marginTop: 10, fontSize: 15.5, margin: "10px 0 4px" }}>{title}</p>
                      <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>
                        {description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Section>

          {/* Generation Logic */}
          <Section id="logic" label="排课算法逻辑">
            <p style={{ color: "#64748b", marginBottom: 20, fontSize: 14.5, lineHeight: 1.6 }}>
              后端核心基于 Google OR-Tools 搭建的 <span style={{ fontWeight: 800, color: "#fff" }}>约束规划 (Constraint Programming, CP)</span> 模型，通过刚性硬约束与走班协同保障课表零冲突。
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 24 }}>
              {CONSTRAINTS.map(({ title, description }) => (
                <BorderGlow
                  key={title}
                  borderRadius={16}
                  backgroundColor="rgba(10, 18, 36, 0.35)"
                  glowColor="170 80 50"
                  style={{
                    transition: "all 0.2s"
                  }}
                  className="hover:border-[#57f1db]/35"
                >
                  <div style={{ padding: 20, width: "100%", height: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <CheckCircle2 size={16} style={{ color: "#2dd4bf", flexShrink: 0 }} />
                      <p style={{ fontWeight: 800, color: "#fff", fontSize: 14.5, margin: 0 }}>{title}</p>
                    </div>
                    <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0, paddingLeft: 26 }}>
                      {description}
                    </p>
                  </div>
                </BorderGlow>
              ))}
            </div>

            {/* Two callout boxes */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <BorderGlow
                borderRadius={16}
                backgroundColor="rgba(87, 241, 219, 0.04)"
                glowColor="170 80 50"
                style={{
                  border: "1px solid rgba(87, 241, 219, 0.12)"
                }}
              >
                <div style={{ padding: 20, width: "100%", height: "100%" }}>
                  <p style={{ fontSize: 10.5, fontWeight: 850, color: "#57f1db", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontFamily: "monospace" }}>
                    求解确定性
                  </p>
                  <p style={{ fontSize: 13, color: "#d4e4fa", lineHeight: 1.65, margin: 0 }}>
                    确定。在输入数据和约束条件一致的情况下，求解器每次都会给出一致的排课结果。只有在经人工确认调代课或重新排课时才会更新。
                  </p>
                </div>
              </BorderGlow>
              <BorderGlow
                borderRadius={16}
                backgroundColor="rgba(255, 255, 255, 0.02)"
                glowColor="258 80 75"
                colors={['#a78bfa', '#38bdf8', '#7c3aed']}
                style={{
                  border: "1px solid rgba(255, 255, 255, 0.05)"
                }}
              >
                <div style={{ padding: 20, width: "100%", height: "100%" }}>
                  <p style={{ fontSize: 10.5, fontWeight: 850, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontFamily: "monospace" }}>
                    全自动还是手动排课？
                  </p>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.65, margin: 0 }}>
                    全自动智能排课。所有课程节次无需人工干预即可一键自动排好，生成后支持在交互课表界面进行手动微调或借助 Agent 智能调代课。
                  </p>
                </div>
              </BorderGlow>
            </div>
          </Section>

          {/* Agent Rules */}
          <Section id="agent-rules" label="Agent 智能调代课">
            <p style={{ color: "#64748b", marginBottom: 20, fontSize: 14.5, lineHeight: 1.6 }}>
              面对教师繁忙、突发请假或走班调整等复杂日常场景，内置 Agent 遵循明确的业务决策原则，保障教学秩序平稳过渡。
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {AGENT_RULES.map(({ icon: RuleIcon, title, description }) => (
                <BorderGlow
                  key={title}
                  borderRadius={16}
                  backgroundColor="rgba(10, 18, 36, 0.35)"
                  glowColor="170 80 50"
                  style={{
                    transition: "all 0.2s"
                  }}
                  className="hover:border-[#57f1db]/35"
                >
                  <div style={{ padding: 20, display: "flex", alignItems: "start", gap: 16, width: "100%", height: "100%" }}>
                    <div style={{
                      flexShrink: 0,
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "rgba(87, 241, 219, 0.08)",
                      color: "#57f1db",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      {RuleIcon && <RuleIcon size={18} />}
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, color: "#fff", fontSize: 15.5, margin: "0 0 4px" }}>{title}</p>
                      <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{description}</p>
                    </div>
                  </div>
                </BorderGlow>
              ))}
            </div>
          </Section>

          {/* Post-Generation */}
          <Section id="post-gen" label="排课后与运维">
            <p style={{ color: "#64748b", marginBottom: 20, fontSize: 14.5, lineHeight: 1.6 }}>
              课表生成后，系统提供冲突检测、统计分析与本地数据持久化保障，满足学校日常教务精细化运维。
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {POST_GEN.map(({ icon: PostIcon, title, description }) => (
                <BorderGlow
                  key={title}
                  borderRadius={16}
                  backgroundColor="rgba(10, 18, 36, 0.35)"
                  glowColor="170 80 50"
                  style={{
                    transition: "all 0.2s"
                  }}
                  className="hover:border-[#57f1db]/35"
                >
                  <div style={{ padding: 20, display: "flex", alignItems: "start", gap: 16, width: "100%", height: "100%" }}>
                    <div style={{
                      flexShrink: 0,
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "rgba(87, 241, 219, 0.08)",
                      color: "#57f1db",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      {PostIcon && <PostIcon size={18} />}
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, color: "#fff", fontSize: 15.5, margin: "0 0 4px" }}>{title}</p>
                      <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{description}</p>
                    </div>
                  </div>
                </BorderGlow>
              ))}
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}
