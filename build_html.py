import os
import re

dir_path = "使用说明-独立副本"

# 读取三个源文件
with open(os.path.join(dir_path, "SideRays.jsx"), "r", encoding="utf-8") as f:
    side_rays = f.read()

with open(os.path.join(dir_path, "BorderGlow.jsx"), "r", encoding="utf-8") as f:
    border_glow = f.read()

with open(os.path.join(dir_path, "GuidePage.jsx"), "r", encoding="utf-8") as f:
    guide_page = f.read()

# 统一清洗源文件中的 import / export
def clean_component(code):
    lines = code.split("\n")
    cleaned = []
    for line in lines:
        if line.strip().startswith("import ") and "from 'ogl'" in line:
            cleaned.append(line)
        elif line.strip().startswith("import "):
            continue
        elif line.strip().startswith("export default function"):
            cleaned.append(line.replace("export default function", "function"))
        elif line.strip().startswith("export default"):
            continue
        else:
            cleaned.append(line)
    return "\n".join(cleaned)

side_rays_clean = clean_component(side_rays)
border_glow_clean = clean_component(border_glow)
guide_page_clean = clean_component(guide_page)

html_template = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>智能排课系统 · 使用说明与开发文档</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- 依赖映射：将 lucide-react 显式绑定到 react@18.3.1 -->
  <script type="importmap">
  {{
    "imports": {{
      "react": "https://esm.sh/react@18.3.1",
      "react-dom": "https://esm.sh/react-dom@18.3.1",
      "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
      "lucide-react": "https://esm.sh/lucide-react@0.468.0?deps=react@18.3.1",
      "ogl": "https://esm.sh/ogl@1.0.11"
    }}
  }}
  </script>
  <!-- Babel Standalone：用于在浏览器端直接编译 JSX -->
  <script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #02050b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }}
    /* 自定义滚动条 */
    ::-webkit-scrollbar {{
      width: 8px;
      height: 8px;
    }}
    ::-webkit-scrollbar-track {{
      background: #0b1528;
    }}
    ::-webkit-scrollbar-thumb {{
      background: #1e3a5f;
      border-radius: 4px;
    }}
    ::-webkit-scrollbar-thumb:hover {{
      background: #2563eb;
    }}
  </style>
</head>
<body class="bg-[#02050b] text-slate-100 min-h-screen">
  <div id="root"></div>

  <!-- 将 Babel 脚本声明为 ES Module -->
  <script type="text/babel" data-type="module" data-presets="react">
// 统一在最顶部导入所有需要的 React Hooks 与外部库
import React, {{ useState, useEffect, useRef, useCallback }} from "react";
import {{ createRoot }} from "react-dom/client";
import {{
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
}} from "lucide-react";

// ================= 1. SideRays.jsx =================
{side_rays_clean}

// ================= 2. BorderGlow.jsx =================
{border_glow_clean}

// ================= 3. GuidePage.jsx =================
{guide_page_clean}

// ================= 4. 挂载入口 =================
const rootElement = document.getElementById("root");
const root = createRoot(rootElement);
root.render(<GuidePage />);
  </script>
</body>
</html>
'''

with open(os.path.join(dir_path, "index.html"), "w", encoding="utf-8") as f:
    f.write(html_template)

with open(os.path.join(dir_path, "build-preview.py"), "w", encoding="utf-8") as f:
    with open("build_html.py", "r", encoding="utf-8") as bf:
        f.write(bf.read())

print("Clean build completed!")
