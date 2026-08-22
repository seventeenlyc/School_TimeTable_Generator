# 后端服务文档 (Backend)

基于 **FastAPI + Google OR-Tools + Pydantic + JsonRepository** 构建的单机本地排课与调代课后端。

---

## 核心架构与设计

1. **统一数据模型（Schema Version 1）**：
   - 数据格式使用 `schema_version = 1`，包含基础数据（教师、班级、科目、教室、排课需求、走班设置）、配置项、课表版本集合、调代课事件与应用记录。
2. **乐观并发控制（Revision）**：
   - 每次数据变更均基于 `base_revision` 进行版本比对。若前端提交的 revision 与本地当前 revision 不一致，返回 `409 Conflict`，避免并发写覆盖。
3. **本地原子写入与自动备份**：
   - 基于 `JsonRepository`，每次保存时先原子写入临时文件再重命名替换，并在修改前自动生成时间戳备份（位于 `backend/data/backups/`）。
4. **单端口静态托管**：
   - `server.py` 会自动探测 `frontend/dist` 目录。若存在，则直接托管前端静态单页应用（SPA）；若前端未构建或 `dist` 不存在，所有 `/api` 接口仍完全可用。

---

## 核心模块职责

- **`domain.py`**：定义全部核心领域实体与 Pydantic 模型（如教师、班级、科目、教室、排课需求 `CourseRequirement`、走班块 `SplitCourseBlock`、课表版本 `TimetableVersion`、调代课事件 `ChangeEvent`、调代课方案 `ChangeProposal` 等）。
- **`validation.py`**：负责基础数据完整性校验、课表结构合法性、教师/班级/场地冲突检测、教师可用时段验证、连堂课约束以及衍生资源索引重建（`rebuild_resource_indexes`）。
- **`base_solver.py`**：基于 Google OR-Tools CP-SAT 求解器构建基础排课约束规划模型，处理全校课表自动生成、硬约束求解及可行性诊断分析。
- **`change_agent.py`**：负责调代课变动事件影响范围分析（`AffectedOccurrence`）与基于规则的直接调代课候选方案生成。
- **`local_optimizer.py`**：基于多目标评分与局部搜索的调代课优化求解器，支持最小改动步数、课时对调、代课安排及长期缺勤生成新版本。
- **`schedule_service.py`**：提供特定真实日期的课表视图解析（`resolve_day`）、按周解析（`resolve_week`）、版本继承派生（`create_child_version`）及生效日期判定。
- **`repository.py`**：负责本地文件持久化 `JsonRepository`，包含 JSON 读写、数据校验、版本乐观锁控制、备份轮转和灾难恢复。

---

## 数据与备份路径

- **主数据文件**：`backend/data/timetable-data.json`
- **备份归档目录**：`backend/data/backups/`
- **样例数据集目录**：`backend/samples/` (包含 15 班级全功能演示样例 `15-class-demo.json`)

---

## 演示样例生成与安装

项目中提供了用于演示与测试的 15 班级规模完整样例数据生成脚本 `backend/sample_15_classes.py`。

### 1. 默认生成样例文件（输出到 `backend/samples/15-class-demo.json`）

在代码仓根目录运行以下命令生成样例 JSON 文件（不会修改当前运行中的数据文件）：

```powershell
backend/venv/Scripts/python.exe backend/sample_15_classes.py
```

### 2. 直接安装样例数据至系统（写入 `backend/data/timetable-data.json`）

若需要直接将样例数据载入系统作为当前主数据，可使用 `--install` 参数：

> **重要提示**：运行带 `--install` 的命令前，**必须先停止本地服务**（避免服务运行中写入导致数据冲突或缓存不一致）。

```powershell
backend/venv/Scripts/python.exe backend/sample_15_classes.py --install
```

---

## 首次安装与运行

### 1. 环境准备与依赖安装

```powershell
cd D:\School_TimeTable_Generator
python -m venv backend\venv
.\backend\venv\Scripts\python.exe -m pip install --upgrade pip
.\backend\venv\Scripts\pip.exe install -r backend\requirements.txt
```

### 2. 启动服务

**开发模式（端口 8000）：**
```powershell
cd D:\School_TimeTable_Generator
.\backend\venv\Scripts\python.exe -m uvicorn server:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

### 3. 运行自动化测试

```powershell
cd D:\School_TimeTable_Generator
.\backend\venv\Scripts\python.exe -m pytest backend/tests -v
```

---

## 路由清单 (API Routes)

`server.py` 中定义的全部 `/api` 接口如下：

| 方法 | 路径 | 用途说明 |
| :--- | :--- | :--- |
| `GET` | `/api/state` | 获取当前全量系统状态（包含 revision、基础数据、课表版本、调代课记录及配置） |
| `PUT` | `/api/catalog` | 更新基础数据（教师、班级、科目、教室、排课需求、走班设置），要求携带 `base_revision` |
| `PUT` | `/api/settings` | 更新排课全局配置（每天节次数、备份上限、权重系数等），要求携带 `base_revision` |
| `POST` | `/api/timetables/generate` | 基于当前基础数据与配置，运行求解器生成课表草案（仅预览，不持久化保存） |
| `POST` | `/api/timetables` | 保存生成的课表版本草案至持久化存储中，创建正式课表版本 |
| `GET` | `/api/timetables` | 获取已保存的全部课表版本概要列表 |
| `GET` | `/api/timetables/{version_id}` | 获取指定课表版本的完整结构与课表矩阵 |
| `POST` | `/api/timetables/{version_id}/versions` | 基于现有版本创建派生子版本课表（支持指定新的 `effective_from` 日期） |
| `DELETE` | `/api/timetables/{version_id}` | 删除未被引用的课表版本（已被派生继承或关联调代课记录的版本禁止删除） |
| `GET` | `/api/backups` | 获取本地历史备份快照列表（文件名、大小、修改时间） |
| `POST` | `/api/backups/{name}/restore` | 恢复指定的本地备份快照（请求体需显式携带 `{"confirmed": true}`） |
| `POST` | `/api/change-proposals` | 提交教师繁忙/缺勤变动事件，计算并返回一组调代课候选优化方案（不修改状态） |
| `POST` | `/api/changes/apply` | 提交选中的调代课方案，重新校验后正式持久化应用并更新日历状态 |
| `GET` | `/api/changes` | 获取全校已应用的调代课历史记录列表（按应用时间倒序排列） |
| `GET` | `/api/calendar/day` | 查询指定真实日期（参数 `date=YYYY-MM-DD`）的最终解析课表（合并版本与代课例外） |

---

## 常见 HTTP 错误状态码说明

- **`409 Conflict`**：
  - `revision_conflict`：提交数据时的 `base_revision` 与当前服务端最新 revision 不一致，说明数据已被其他操作修改，需重新拉取最新状态后重试；
  - 课表版本已被其他子版本继承或已被调代课事件引用时尝试删除，返回 409。
- **`422 Unprocessable Entity`**：
  - `schedule_validation_failed`：基础数据或课表结构不满足业务校验规则（如教师/场地重叠、连堂破损、超额排课等）；
  - `generation_failed`：OR-Tools 求解器判定在当前约束条件下无可行解，返回结构化排课诊断信息；
  - `no_complete_change_plan` / `proposal_tampered_or_invalid`：无法找到可行的调代课方案，或前端提交的应用方案与当前最新状态计算结果不匹配；
  - `resolved_schedule_conflict`：调代课应用后在指定真实日期日历中产生了新的资源冲突。
- **`503 Service Unavailable`**：
  - `data_file_unavailable`：本地 `timetable-data.json` 数据文件损坏、无法解析或无法访问。
