import os
import subprocess

subprocess.run(["python", "rebuild_html.py"])
if os.path.exists("rebuild_html.py"):
    os.remove("rebuild_html.py")
if os.path.exists("cleanup.py"):
    os.remove("cleanup.py")
print("All tasks finished successfully!")
