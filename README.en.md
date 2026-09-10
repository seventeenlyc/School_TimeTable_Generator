# Local Intelligent School Timetabling & Teacher Substitution System

Language: [中文](README.md) | English (current page)

> This project is a substantial refactor and feature extension based on the open-source project [a6hinandh/School_TimeTable_Generator](https://github.com/a6hinandh/School_TimeTable_Generator).
> It is released under the **CC BY-NC 4.0** license.

## Overview

This project is an offline school timetabling and teacher substitution system designed for local school administration. It combines a FastAPI backend, the Google OR-Tools CP-SAT solver, and a React/Vite frontend. The application runs on a local computer, stores data in JSON files, and does not require an online service, authentication system, or database server.

## Key features

- **Offline, standalone operation**: suitable for a school LAN or a single office computer; data remains on the local machine.
- **Constraint-based timetable generation**: supports teacher, class, and dedicated-room conflict avoidance; teacher availability and preferences; double periods; and synchronized split-course blocks across classes.
- **Scheduling rules for school timetables**: Monday-to-Friday schedules, daily Chinese and English lessons, one or two daily mathematics lessons, and limits for elective subjects.
- **Intelligent teacher substitution agent**:
  - temporary teacher unavailability: prefers small in-class adjustments and then recommends available teachers of the same subject;
  - teacher absence: prioritizes available subject teachers and calculates local swaps when necessary;
  - long-term absence: generates a new timetable version for a stable transition when the teacher returns;
  - proposal scoring and two-step confirmation before changes take effect.
- **Versioning and calendar views**: timetable versions include an effective date and support history tracking, comparison, and date-based schedule resolution.
- **Backups and recovery**: automatically creates timestamped backup snapshots and provides a recovery panel for rollback.

## Requirements

- **Python**: 3.10 or 3.11, available on `PATH`
- **Node.js**: an LTS release, v18+ or v20+, available on `PATH`
- **Operating system**: the included one-click scripts target Windows; the backend and frontend can also be started separately on other systems.

## Installation

Open PowerShell in the project root:

```powershell
cd D:\School_TimeTable_Generator

# Create the backend virtual environment and install dependencies
python -m venv backend\venv
.\backend\venv\Scripts\python.exe -m pip install --upgrade pip
.\backend\venv\Scripts\pip.exe install -r backend\requirements.txt

# Install frontend dependencies
cd frontend
npm install
cd ..
```

## Running the application

### One-click startup (recommended for daily use)

From the project root, double-click `start-local.bat` or `一键启动.bat`. The script checks the environment, builds the frontend, starts the FastAPI backend, and opens:

```text
http://127.0.0.1:8001
```

Press `Ctrl + C` in the service console to stop the application.

### Developer mode

Start the backend and frontend in separate terminals:

```powershell
# Terminal 1: FastAPI backend with reload, port 8000
.\backend\venv\Scripts\python.exe -m uvicorn server:app --app-dir backend --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Vite development server, port 5173
cd frontend
npm run dev
```

Open `http://127.0.0.1:5173`. The Vite configuration proxies `/api` requests to the backend on port 8000.

## Project structure

```text
School_TimeTable_Generator/
├── LICENSE                   # CC BY-NC 4.0 license
├── README.md                 # Chinese documentation
├── README.en.md              # English documentation
├── start-local.bat           # Windows one-click startup script
├── start-local.ps1           # Build and startup logic
├── launcher.py               # Offline environment checker and launcher
│
├── backend/                  # FastAPI + OR-Tools backend
│   ├── base_solver.py        # Base CP-SAT timetable solver
│   ├── change_agent.py       # Teacher substitution proposal engine
│   ├── local_optimizer.py    # Local timetable optimizer
│   ├── domain.py             # Domain entities and data models
│   ├── validation.py         # Timetable and business-rule validation
│   ├── repository.py         # Local JSON repository and backups
│   ├── schedule_service.py   # Calendar views and version resolution
│   ├── server.py             # FastAPI REST API entry point
│   ├── requirements.txt      # Backend dependencies
│   └── tests/                # Backend pytest suite
│
└── frontend/                 # React + Vite + Tailwind frontend
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx           # Routes and root component
        ├── api/              # API client and error handling
        ├── domain/           # Timetable calculations and exports
        └── pages/             # Dashboard, catalog, timetable, and agent views
```

## Tests

Run the backend test suite and frontend tests/lint checks with:

```powershell
# Backend
.\backend\venv\Scripts\python.exe -m pytest backend/tests -v

# Frontend
cd frontend
npm run test:run
npm run lint
```

For more detailed component-level documentation, see [`backend/README.md`](backend/README.md) and [`frontend/README.md`](frontend/README.md).

## License

The project is distributed under the [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](LICENSE) license. Redistribution and adaptation are allowed with attribution, modification notices, and a link to the license; commercial use requires separate authorization from the copyright holder. Third-party dependencies remain subject to their own licenses.

The project concept and initial prototype originated from [a6hinandh/School_TimeTable_Generator](https://github.com/a6hinandh/School_TimeTable_Generator). See [LICENSE](LICENSE) for the complete license text.
