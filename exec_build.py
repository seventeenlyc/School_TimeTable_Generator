import subprocess
import os

subprocess.run(["python", "build_html.py"])
if os.path.exists("build_html.py"):
    os.remove("build_html.py")
print("Executed and cleaned up build_html.py")
