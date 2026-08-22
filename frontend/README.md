# 前端客户端文档 (Frontend)

基于 **React 19 + Vite + Tailwind CSS** 构建的单页排课与调代课管理系统，纯单机离线运行，无需登录认证。

---

## 核心技术与设计

- **框架与构建工具**：React 19 + Vite
- **UI 与样式**：Tailwind CSS + Lucide React 图标库 + React Hot Toast 消息提示
- **路由管理**：React Router DOM 7
- **免认证与单机化**：彻底移除第三方登录与用户隔离，所有用户操作直达功能页面。
- **API 通信规范**：
  - 封装于 `src/api/client.js`，默认使用**同源相对路径**发起请求（由同一服务或 Vite 代理转发）；
  - `VITE_API_BASE_URL` 环境变量仅作为可选的显式 API 地址覆盖，日常本地运行无需配置；
  - 生产构建产物（`frontend/dist`）直接由 FastAPI 后端在单端口（如 8001）下统一托管。

---

## 路由与页面职责

| 路由路径 | 页面组件 | 页面职责与功能 |
| :--- | :--- | :--- |
| `/` | `DashboardPage` | **系统仪表盘**：显示当前激活课表、已生效调代课统计、版本列表、备份概览及系统状态入口 |
| `/catalog` | `CatalogPage` | **基础数据管理**：管理班级、教师、科目、专用教室、排课课时需求及同步走班块设置 |
| `/generate` | `GeneratePage` | **智能排课引擎**：配置排课约束参数，调用后端 OR-Tools 求解器生成并预览全校课表，确认后保存 |
| `/timetables/:id` | `TimetablePage` | **课表展示与日历视图**：按班级、教师、真实日期查看周课表与特定日期已解析课表（包含代课标记） |
| `/timetables/:id/edit` | `EditTimetablePage` | **课表编辑与派生**：微调现有课表单元格或基于当前课表创建带有新生效日期的派生子版本 |
| `/changes` | `ChangeAgentPage` | **智能调代课 Agent**：录入教师请假或临时繁忙事件，计算推荐方案并对比评分，确认后一键应用 |
| `/guide` | `GuidePage` | **使用指南**：系统核心概念、走班课配置示例与排课调代课操作手册 |

> **旧路由重定向**：历史路径 `/dashboard`、`/login`、`/sign-up`、`/sso-callback` 以及所有未匹配路径均自动重定向至根路径 `/`。

---

## 本地安装与开发命令

在 `frontend` 目录下打开 Windows PowerShell 执行：

```powershell
cd D:\School_TimeTable_Generator\frontend

# 1. 安装依赖
npm install

# 2. 启动前端开发服务器 (默认端口 5173，/api 自动代理至 http://127.0.0.1:8000)
npm run dev

# 3. 运行前端自动化测试 (Vitest)
npm run test:run

# 4. 代码风格与质量检查
npm run lint

# 5. 构建生产环境静态资源 (输出至 dist/)
npm run build
```

---

## 单端口整合与生产部署

日常生产启动时（如通过根目录 `start-local.bat`），系统执行 `npm run build` 生成 `frontend/dist` 静态资源，FastAPI 后端在单端口（如 `8001`）直接托管该目录与 `/api` 接口。无需另外运行单独的前端静态服务器。
