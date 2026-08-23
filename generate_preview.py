import os
import re

dir_path = "使用说明-独立副本"

with open(os.path.join(dir_path, "SideRays.jsx"), "r", encoding="utf-8") as f:
    side_rays = f.read()

with open(os.path.join(dir_path, "BorderGlow.jsx"), "r", encoding="utf-8") as f:
    border_glow = f.read()

with open(os.path.join(dir_path, "GuidePage.jsx"), "r", encoding="utf-8") as f:
    guide_page = f.read()

# Strip local imports
guide_page = re.sub(r'import SideRays from "\.\./components/SideRays";\s*', '', guide_page)
guide_page = re.sub(r'import BorderGlow from "\.\./components/BorderGlow";\s*', '', guide_page)

module_code = f"""import React from "react";
// ================= SideRays.jsx =================
{side_rays}

// ================= BorderGlow.jsx =================
{border_glow}

// ================= GuidePage.jsx =================
{guide_page}

// ================= mount =================
import {{ createRoot }} from "react-dom/client";
createRoot(document.getElementById("root")).render(<GuidePage />);
"""

html_template = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>使用说明 · 排课调度系统（独立预览）</title>
<script src="https://cdn.tailwindcss.com"></script>
<script type="importmap">
{{
  "imports": {{
    "react": "https://esm.sh/react@19.1.0",
    "react-dom/client": "https://esm.sh/react-dom@19.1.0/client",
    "lucide-react": "https://esm.sh/lucide-react@0.525.0",
    "ogl": "https://esm.sh/ogl@1.0.11"
  }}
}}
</script>
<script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  body {{
    margin: 0;
    padding: 0;
    background: #030712;
    color: #e2e8f0;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  }}
  ::-webkit-scrollbar {{
    width: 8px;
    height: 8px;
  }}
  ::-webkit-scrollbar-track {{
    background: #030712;
  }}
  ::-webkit-scrollbar-thumb {{
    background: #1e293b;
    border-radius: 4px;
  }}
  ::-webkit-scrollbar-thumb:hover {{
    background: #334155;
  }}
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel" data-type="module" data-presets="react">
{module_code}
</script>
</body>
</html>
"""

with open(os.path.join(dir_path, "index.html"), "w", encoding="utf-8") as f:
    f.write(html_template)

print(f"index.html generated successfully! File size: {len(html_template.encode('utf-8'))} bytes")
