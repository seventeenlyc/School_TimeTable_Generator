@echo off
title School Timetable Generator - Backend Service
echo ====================================================
echo Starting School Timetable Local Backend (FastAPI)...
echo Server: http://127.0.0.1:8000
echo ====================================================
cd /d "%~dp0backend"
if exist "venv\Scripts\python.exe" (
    "venv\Scripts\python.exe" -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload
) else (
    python -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload
)
pause
