import os

root_dir = os.path.join(os.path.dirname(__file__), "使用说明-独立副本")
siderays_path = os.path.join(root_dir, "SideRays.jsx")
borderglow_path = os.path.join(root_dir, "BorderGlow.jsx")
guidepage_path = os.path.join(root_dir, "GuidePage.jsx")
output_path = os.path.join(root_dir, "index.html")
bat_path = os.path.join(root_dir, "preview.bat")

# 同时更新 build-preview.py，确保后续修改 jsx 后也能一键重新编译
build_py_path = os.path.join(root_dir, "build-preview.py")
build_py_content = '''import os
import re

root_dir = os.path.dirname(__file__)
siderays_path = os.path.join(root_dir, "SideRays.jsx")
borderglow_path = os.path.join(root_dir, "BorderGlow.jsx")
guidepage_path = os.path.join(root_dir, "GuidePage.jsx")
output_path = os.path.join(root_dir, "index.html")

with open(siderays_path, "r", encoding="utf-8") as f:
    siderays_code = f.read()

with open(borderglow_path, "r", encoding="utf-8") as f:
    borderglow_code = f.read()

with open(guidepage_path, "r", encoding="utf-8") as f:
    guidepage_code = f.read()

# 移除重复导入
siderays_clean = re.sub(r'import\\s+\\{[^}]+\\}\\s+from\\s+[\'"]react[\'"];?', '', siderays_code)
borderglow_clean = re.sub(r'import\\s+\\{[^}]+\\}\\s+from\\s+[\'"]react[\'"];?', '', borderglow_code)
guidepage_clean = re.sub(r'import\\s+\\{[^}]+\\}\\s+from\\s+[\'"]react[\'"];?', '', guidepage_code)
guidepage_clean = re.sub(r'import\\s+SideRays\\s+from\\s+[\'"][^\'"]+[\'"];?', '', guidepage_clean)
guidepage_clean = re.sub(r'import\\s+BorderGlow\\s+from\\s+[\'"][^\'"]+[\'"];?', '', guidepage_clean)
siderays_clean = re.sub(r'export\\s+default\\s+SideRays;?', '', siderays_clean)
borderglow_clean = re.sub(r'export\\s+default\\s+BorderGlow;?', '', borderglow_clean)

module_code = f"""// 统一在最顶部导入所有需要的 React Hooks
import React, {{ useState, useEffect, useRef, useCallback }} from "react";
import {{ createRoot }} from "react-dom/client";

// ================= 1. SideRays.jsx =================
{siderays_clean.strip()}

// ================= 2. BorderGlow.jsx =================
{borderglow_clean.strip()}

// ================= 3. GuidePage.jsx =================
{guidepage_clean.strip()}

// ================= 4. 挂载渲染 =================
const rootElement = document.getElementById("root");
if (rootElement) {{
  const root = createRoot(rootElement);
  root.render(<GuidePage />);
}}
"""

html_content = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>智能排课系统 · 使用说明与开发文档</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script type="importmap">
  {{
    "imports": {{
      "react": "https://esm.sh/react@18.3.1",
      "react-dom": "https://esm.sh/react-dom@18.3.1",
      "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
      "lucide-react": "https://esm.sh/lucide-react@0.468.0",
      "ogl": "https://esm.sh/ogl@1.0.11"
    }}
  }}
  </script>
  <script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #02050b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }}
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
  <script type="text/babel" data-type="module" data-presets="react">
{module_code}
  </script>
</body>
</html>
"""

with open(output_path, "w", encoding="utf-8") as f:
    f.write(html_content)
print("index.html rebuild successful!")
'''

with open(build_py_path, "w", encoding="utf-8") as f:
    f.write(build_py_content)

bat_content = """@echo off
chcp 65001 >nul
python "%~dp0build-preview.py"
start "" "%~dp0index.html"
"""

with open(bat_path, "w", encoding="utf-8") as f:
    f.write(bat_content)

# 清理临时文件
for tmp in ["clean.py", "run_fix.py", "verify_html.py"]:
    if os.path.exists(tmp):
        os.remove(tmp)

print("Setup completed successfully!")
