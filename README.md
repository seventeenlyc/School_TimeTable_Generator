# 本地智能排课与调代课系统 (School Timetable Generator)

一套专为学校单机离线环境设计的排课与调代课管理系统。系统开箱即用，无需配置数据库或云端账号，无登录认证，所有排课数据和调代课记录均保存在本地 JSON 文件中。

---

## 核心定位与特性

- **单机离线运行**：面向单台 Windows 电脑，无需外部网络，不依赖云服务或外部数据库。
- **开箱即用与免登录**：启动后即可直接进入系统操作，无登录认证与鉴权限制。
- **本地 JSON 存储**：所有基础数据、课表版本与调代课记录均保存在本地单个 JSON 文件中，支持版本乐观并发控制与自动轮转备份。
- **周一至周六排课**：支持周一到周六基础课表编排，适配国内中学/小学标准作息。
- **多维度硬约束求解**：基于 Google OR-Tools CP-SAT 求解器，自动保证教师无冲突、班级无冲突、专用教室无冲突、教师不可用时段避让、连堂课（双课时连续）绑定排课。
- **真实生效日期与版本化课表**：每张课表均拥有明确的生效日期（`effectiveFrom`）与版本继承关系（不可直接破坏历史版本）。
- **智能调代课与 Agent 建议**：针对教师突发临时繁忙、短期缺勤请假或长期请假，自动计算最优调代课方案，支持方案对比、预览确认后一键应用。
- **安全备份与一键恢复**：状态变更自动创建时间戳备份，支持随时回滚与灾难恢复。

---

## 首次安装

运行环境要求：
- **Python**：3.10 或 3.11（需加入系统 PATH）
- **Node.js**：LTS 版本（v18+ 或 v20+，需加入系统 PATH）

打开 Windows PowerShell，依次执行以下命令：

```powershell
# 1. 进入项目根目录
cd D:\School_TimeTable_Generator

# 2. 创建后端虚拟环境并安装 Python 依赖
python -m venv backend\venv
.\backend\venv\Scripts\python.exe -m pip install --upgrade pip
.\backend\venv\Scripts\pip.exe install -r backend\requirements.txt

# 3. 安装前端依赖
cd frontend
npm install
cd ..
```

---

## 日常启动与使用

### 方式一：一键启动（推荐）

在项目根目录双击运行 `start-local.bat`。

该脚本会自动：
1. 校验 Python 虚拟环境与前端依赖；
2. 构建前端静态资源（`npm run build`）；
3. 启动本地 Uvicorn 服务并托管前后端（端口 `8001`）；
4. 自动在浏览器中打开 `http://127.0.0.1:8001`。

> **停止服务**：在弹出的控制台窗口中按 `Ctrl + C` 即可安全停止。

### 方式二：开发模式（前后端分离调试）

如需进行前后端开发与热重载调试，可分别打开两个终端：

**终端 1（启动后端 API 服务，端口 8000）：**
```powershell
cd D:\School_TimeTable_Generator
.\backend\venv\Scripts\python.exe -m uvicorn server:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

**终端 2（启动前端 Vite 开发服务器，端口 5173）：**
```powershell
cd D:\School_TimeTable_Generator\frontend
npm run dev
```

前端开发服务器会自动将 `/api` 请求代理转发到 `http://127.0.0.1:8000`。

---

## 本地数据存储与备份

- **运行数据文件**：`backend/data/timetable-data.json`（保存当前全部基础设置、基础字典、课表版本和调代课历史）。
- **本地备份目录**：`backend/data/backups/`（每次状态修改前自动备份，按时间戳命名）。
- **注意事项**：**严禁在服务运行期间手动直接修改 `timetable-data.json` 文件**，以免引起 JSON 损坏或并发版本号冲突。

### 备份与恢复操作

1. **自动备份**：每次通过界面保存课表、修改基础数据或应用调代课时，系统都会在 `backend/data/backups/` 目录下自动生成备份快照，并保留最近设定的备份份数（默认 20 份）。
2. **灾难恢复**：
   - 当数据文件不可用返回 503 时，系统仪表盘会显示 RecoveryPanel 并列出备份，供用户选择并确认恢复。
   - 正常运行时，高级用户可调用 restore API（`POST /api/backups/{name}/restore`，携带 `{"confirmed": true}`）进行指定版本恢复。

---

## 同步走班教学（分层走班）排课机制

系统原生支持多班级同步走班（Split Course Block）排课：

### 业务场景示例：高一 1 班与 2 班的地理/政治分层走班

- **常规课程独立排课**：高一 1 班与高一 2 班各自的语文、数学、英语、物理、化学等常规课程保持各班独立编排，教师与教室互不干扰。
- **走班课程强同步**：在同一节走班课时内，1 班与 2 班学生同时打散重组：
  - 走班组 A（地理方向）：由**张老师**在 **301 教室**授课；
  - 走班组 B（政治方向）：由**王老师**在 **302 教室**授课；
- **排课引擎规则**：
  - 1 班与 2 班在周课表中该节次必须**强行绑定在完全相同的星期与节次**（同星期、同节次打上相同的走班块 ID）；
  - 走班期间 1 班与 2 班原行政班教室空出或作为走班教室，张老师与王老师分别占用 301 与 302 教室，不可出现教师与场地冲突。

---

## 调代课 Agent 决策规则

系统内置基于规则与局部优化的智能调代课引擎（Change Agent），在处理不同类型的变动事件时遵循以下优先级与决策规则：

1. **教师临时繁忙（Busy）**：
   - 优先在**本班级内部寻找可行节次进行课时对调**（最小化对其他班级和教师的影响）；
   - 仅当班内对调无法满足（如冲突或连堂限制）时，才触发**同科目其他空闲教师临时跨班代课**。
2. **教师缺勤请假（Absence）**：
   - 优先寻找**同科目具备资质的空闲教师进行代课**；
   - 仅当无可用代课教师时，再执行**改动步数最少的课时调换**方案。
3. **走班课程（Split Block）变动**：
   - 走班课程牵涉多个行政班同步，**强烈优先安排同科目教师代课**，避免破坏跨班级的同步时间槽。
4. **长期缺勤处理（Long-term Absence）**：
   - 长期请假若触发课时重新编排，系统会自动**生成一张全新的继承版本课表**；
   - 当原请假教师康复/恢复返岗时，**不会自动强制回滚历史课表**，需用户按需生成新版本，确保教学秩序平稳过渡。
5. **课时平衡原则**：
   - 调代课决策始终保障各班级单周各科目的总课时数大体保持稳定，不随意增减或删减课时。
6. **两阶段确认机制**：
   - 所有生成的调代课建议均提供清晰的调整步骤、影响范围与评分；
   - **必须由教务管理人员在界面上预览确认后**，才会真正写入课表并持久化生效。

---

## 项目目录概览

```text
School_TimeTable_Generator/
├── README.md                 # 项目全局说明文档
├── start-local.bat           # Windows 双击一键启动脚本
├── start-local.ps1           # 本地构建与启动核心 PowerShell 脚本
├── backend/                  # 后端项目目录 (FastAPI + OR-Tools)
│   ├── README.md             # 后端架构与接口说明文档
│   ├── requirements.txt      # 后端 Python 依赖清单
│   ├── server.py             # FastAPI 服务入口与路由定义
│   ├── domain.py             # 核心领域模型与 Pydantic 实体定义
│   ├── validation.py         # 课表结构、冲突与规则校验器
│   ├── base_solver.py        # 基于 OR-Tools CP-SAT 的排课求解器
│   ├── change_agent.py       # 调代课事件分析与规则推荐
│   ├── local_optimizer.py    # 调代课局部重排优化器
│   ├── schedule_service.py   # 日历视图解析与课表版本管理
│   ├── repository.py         # JSON 数据仓库与备份恢复管理
│   ├── data/                 # 本地运行数据与备份目录
│   │   ├── timetable-data.json
│   │   └── backups/
│   └── tests/                # 后端 pytest 单元测试与集成测试
└── frontend/                 # 前端项目目录 (React + Vite + Tailwind CSS)
    ├── README.md             # 前端架构与路由说明文档
    ├── package.json          # 前端依赖配置
    ├── vite.config.js        # Vite 构建与开发反向代理配置
    └── src/                  # 前端源码
        ├── App.jsx           # 前端主应用与路由配置
        ├── api/client.js     # API 请求封装客户端
        └── pages/            # 页面组件（仪表盘、基础数据、排课、课表展示、调代课等）
```

---

## 运行测试

### 运行后端测试

```powershell
cd D:\School_TimeTable_Generator
.\backend\venv\Scripts\python.exe -m pytest backend/tests -v
```

### 运行前端测试与代码检查

```powershell
cd D:\School_TimeTable_Generator\frontend
npm run test:run
npm run lint
```
