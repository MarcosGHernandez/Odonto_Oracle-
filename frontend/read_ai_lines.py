import os

file_path = r"c:\Users\Predator Pro\OneDrive\Documents\Proyectos\Marcos_proyects\Hackaton odonto\frontend\node_modules\ai\dist\index.js"
if os.path.exists(file_path):
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
        print(f"Total lines: {len(lines)}")
        start = max(0, 8540)
        end = min(len(lines), 8565)
        for i in range(start, end):
            print(f"{i+1}: {lines[i]}", end="")
else:
    print("File not found.")
