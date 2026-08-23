import os

for f in ["clean_temp.py", "clean.py", "test_import.json"]:
    if os.path.exists(f):
        os.remove(f)
        print("Cleaned:", f)
