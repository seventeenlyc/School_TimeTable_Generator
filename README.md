# 本地智能排课与调代课系统 (School Timetable Generator)

> 本项目源自并基于开源项目 [a6hinandh/School_TimeTable_Generator](https://github.com/a6hinandh/School_TimeTable_Generator) 进行深度重构与功能创作。
> 遵循 **CC BY-NC 4.0**（知识共享 署名-非商业性使用 4.0 国际）开源协议。

---

## 🌟 项目演进与重构对比 (两代架构核心区别)

原版项目提供了一个基于云端/在线服务的简单课表生成原型，重构后的版本全面转向**国内中小学教育场景、单机离线、数学规划求解引擎与智能调代课 Agent** 体系。两者的具体对比如下：

| 维度 / 模块 | 原版 (Upstream: `a6hinandh/School_TimeTable_Generator`) | 重构版本 (当前项目: 本地智能排课与调代课系统) |
| :--- | :--- | :--- |
| **应用架构** | 前后端分离在线应用，依赖 MongoDB 数据库与用户鉴权系统（Sign In/Sign Up） | **完全单机离线运行**，无认证免登录，开箱即用，支持一键脚本自动托管与浏览器唤起 |
| **存储机制** | 云端 / 本地 MongoDB 数据库存储 | **本地单 JSON 文件原子化持久存储**，内置版本乐观并发控制与自动轮转备份机制 |
| **核心排课算法** | 基础启发式/回溯贪心搜索（`generator.py`），约束表达能力有限 | **Google OR-Tools CP-SAT 约束规划求解引擎**（`base_solver.py`），支持严格硬约束与目标优化 |
| **排课业务规则** | 仅支持单周标准班级基础排课 | **固定周一至周五排课**、语文和英语每日各一节、数学每日一至两节、选科同科每日最多一节，并支持连堂课、教师不可用时段避让、专用教室互斥和**跨班级分层走班（Split Course Block）** |
| **课表版本与日历** | 静态课表生成与覆盖 | **版本化课表体系**（带明确生效日期 `effectiveFrom`、历史版本追溯与差异比对），日历化日期视图解析 |
| **智能调代课 (Agent)** | ❌ 无调代课与应急处理机制 | ✅ **内置智能调代课决策引擎**（`change_agent.py` + `local_optimizer.py`），支持临时繁忙、缺勤代课、长期请假新版本生成与两阶段预览确认 |
| **前端交互与体验** | 基础 React + 传统 CSS 样式，步骤繁琐 | **现代 React + Vite + Tailwind CSS**，具备向导式目录校验、错误即时定位与高亮跳转、暗色主题交互 |
| **测试与质量工程** | 缺乏自动化测试 | 拥有完整的 **pytest** 后端测试套件与 **vitest** 前端单元/组件测试套件（覆盖率高） |

---

## 🚀 核心特性

1. **单机离线，开箱即用**
   - 面向校园局域网或单台办公电脑设计，不依赖外网连接、无须部署复杂数据库（如 MySQL/MongoDB），数据完全存储在本地。
2. **OR-Tools CP-SAT 工业级排课求解**
   - 教师无时间冲突、班级无时间冲突、专用功能教室无冲突；
   - 教师偏好与不可用时段严格避让；
   - 连堂课（双课时）自动同天连续排布；
   - 跨行政班分层走班（走班教学组）强同步锁定与资源调度。
3. **智能调代课决策 Agent**
   - **教师临时繁忙（Busy）**：优先班内微调对调，最小化波及面；必要时推荐同科目空闲教师代课。
   - **教师请假缺勤（Absence）**：优先同科目空闲教师代课，无可用教师时计算最少步数的局部调换。
   - **长期缺勤（Long-term）**：智能生成新版本课表，返岗平稳过渡。
   - **方案量化评分与两阶段确认**：提供调动步骤详情与量化影响分值，教务确认后方可写入生效。
4. **安全备份与灾难恢复**
   - 每次保存和修改状态前自动创建时间戳备份快照（默认保留 20 份）；
   - 提供可视化数据恢复面板（RecoveryPanel）与一键回滚能力。

---

## 🛠️ 快速上手与运行环境

### 运行环境要求
- **Python**：3.10 或 3.11（需添加至系统 PATH）
- **Node.js**：LTS 版本（v18+ 或 v20+，需添加至系统 PATH）

### 1. 首次安装依赖

打开终端（Windows PowerShell），在项目根目录下执行：

```powershell
# 1. 进入项目根目录
cd D:\School_TimeTable_Generator

# 2. 初始化后端虚拟环境并安装依赖
python -m venv backend\venv
.\backend\venv\Scripts\python.exe -m pip install --upgrade pip
.\backend\venv\Scripts\pip.exe install -r backend\requirements.txt

# 3. 安装前端依赖
cd frontend
npm install
cd ..
```

---

## 💻 启动方式

### 方式一：一键启动（日常使用推荐）

在项目根目录直接双击 `start-local.bat` 或 `一键启动.bat`。

脚本会自动完成环境校验、前端静态资源构建、启动 FastAPI 后端服务并自动在默认浏览器中打开系统：
```text
http://127.0.0.1:8001
```

> **停止服务**：在弹出的控制台窗口中按 `Ctrl + C` 即可正常退出。

### 方式二：开发者模式（前后端热重载）

若需对源码进行二次开发，可分别启动前后端：

- **终端 1（后端 API 服务，端口 8000）**：
  ```powershell
  .\backend\venv\Scripts\python.exe -m uvicorn server:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
  ```
- **终端 2（前端 Vite 开发服务器，端口 5173）**：
  ```powershell
  cd frontend
  npm run dev
  ```
  浏览器访问 `http://127.0.0.1:5173`（前端已配置 `/api` 请求自动反向代理到 8000 端口）。

---

## 📂 项目结构概览

```text
School_TimeTable_Generator/
├── LICENSE                   # CC BY-NC 4.0 开源许可协议说明
├── README.md                 # 项目使用与架构说明文档
├── start-local.bat           # Windows 一键启动脚本
├── start-local.ps1           # 核心构建与启动脚本
├── launcher.py               # 离线环境检测与启动调度器
│
├── backend/                  # 后端核心服务 (FastAPI + OR-Tools)
│   ├── base_solver.py        # 基于 CP-SAT 的全自动基础课表求解器
│   ├── change_agent.py       # 智能调代课规则分析与方案生成
│   ├── local_optimizer.py    # 调代课局部重排与优化求解器
│   ├── domain.py             # 核心领域实体与数据模型定义
│   ├── validation.py         # 课表结构合法性与业务约束校验器
│   ├── repository.py         # 本地 JSON 数据仓库与自动备份轮转
│   ├── schedule_service.py   # 日历视图生成与课表版本解析
│   ├── server.py             # FastAPI HTTP RESTful API 入口
│   ├── requirements.txt      # 后端运行依赖清单
│   ├── data/                 # 本地运行时数据与备份存储
│   │   ├── timetable-data.json
│   │   └── backups/
│   └── tests/                # 后端 pytest 自动化测试套件
│
└── frontend/                 # 前端应用 (React 18 + Vite + Tailwind CSS)
    ├── package.json          # 前端依赖配置
    ├── vite.config.js        # Vite 配置文件与反向代理
    └── src/
        ├── App.jsx           # 路由与根组件
        ├── api/client.js     # API 客户端封装与统一异常处理
        ├── domain/           # 课表矩阵计算、导出等业务逻辑
        └── pages/
            ├── dashboard/    # 仪表盘与系统健康恢复面板
            ├── catalog/      # 基础数据维护（班级/教师/教室/分层走班/时段设置）
            ├── generate/     # 课表智能生成向导与求解控制台
            ├── timetable/    # 班级/教师多维课表查询与手动微调
            └── agent/        # 智能调代课中心与方案对比审核
```

---

## 🧪 自动化测试

项目包含完善的前后端自动化测试体系，可随时执行验证：

```powershell
# 运行后端全部测试套件
.\backend\venv\Scripts\python.exe -m pytest backend/tests -v

# 运行前端测试与代码风格检查
cd frontend
npm run test:run
npm run lint
```

---

## 📄 开源许可

本项目整体遵循 **[Creative Commons Attribution-NonCommercial 4.0 International（CC BY-NC 4.0）](LICENSE)** 协议：允许在署名、标注修改并附上许可链接的前提下进行非商业性分享与演绎；商业使用须先取得版权方的另行授权。第三方依赖项继续适用其各自的许可。

本项目概念与最初原型源自 [a6hinandh/School_TimeTable_Generator](https://github.com/a6hinandh/School_TimeTable_Generator)，特此致谢。

完整协议内容与条款请参阅 [LICENSE](LICENSE) 文件。
