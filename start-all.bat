@echo off
title School Timetable Generator - One-Click Launcher
echo ====================================================
echo Starting School Timetable Local Standalone System...
echo ====================================================
start "Timetable Backend" "%~dp0start-backend.bat"
timeout /t 2 /nobreak >nul
start "Timetable Frontend" "%~dp0start-frontend.bat"
echo System services started.
