with open("使用说明-独立副本/index.html", "r", encoding="utf-8") as f:
    content = f.read()

checks = [
    ("Tailwind CDN", "cdn.tailwindcss.com"),
    ("Import Map", '"lucide-react": "https://esm.sh/lucide-react@0.525.0"'),
    ("Author Info", "拾柒"),
    ("WeChat", "z13435142650"),
    ("Email QQ", "2166652427@qq.com"),
    ("Email SZU", "2025150194@mails.szu.edu.cn"),
    ("GitHub Repo", "https://github.com/seventeenlyc/School_TimeTable_Generator"),
    ("Course Excel Header", "固定时间（星期*节次）"),
    ("Teacher Excel Header", "主教学科"),
    ("Algorithm Intro", "遗传算法"),
    ("Constraint Logic", "硬约束"),
    ("Soft Constraint", "软约束"),
]

for label, keyword in checks:
    print(f"[{'PASS' if keyword in content else 'FAIL'}] {label}")

print("\nTotal file length:", len(content), "chars")
