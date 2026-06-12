# School Timetable Generator

A full-stack web application that uses **Google OR-Tools CP-SAT** constraint programming to generate clash-free school timetables automatically. Admins configure classes, subjects, and teacher profiles through a guided 4-step wizard; the solver produces optimized schedules in under 60 seconds. Generated timetables can be edited, exported in multiple formats, and saved as versioned drafts.

**Live Demo:** https://timetable-generator-t4h3.onrender.com

---

## Features

- **CP-SAT constraint solver** — Mathematically guaranteed clash-free schedules via Google OR-Tools
- **Infeasibility diagnostics** — When no valid timetable exists, a relaxation penalty model identifies every violated constraint with human-readable messages
- **Teacher unavailability** — Block specific day/period slots per teacher; the solver enforces them as hard constraints
- **Lab room scheduling** — Lab subjects scheduled in consecutive double-period blocks; at most one class per lab subject per slot
- **Real-time edit validation** — Every manual cell swap is validated against 7 constraint rules server-side before being committed
- **Bulk Excel import** — Upload a pre-formatted `.xlsx` to populate all settings at once; 5-sheet template available for download
- **Multi-format export** — PDF (html2canvas + jsPDF), Excel (.xlsx via SheetJS), iCalendar (.ics with weekly recurrence), and browser print (A4 landscape)
- **Timetable versioning** — Save as new draft or overwrite; dashboard groups versions by `parentGroupId`
- **Teacher workload summary** — Visual panel showing assigned vs. available periods per teacher with over-limit alerts
- **Clerk authentication** — Secure user accounts; all timetables scoped to the authenticated user

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + Vite | 19 / 7 |
| Styling | Tailwind CSS (via @tailwindcss/vite) | v4.3 |
| Animations | GSAP | 3.13 |
| Icons | lucide-react | 0.525 |
| Auth | Clerk | 5.33 |
| Backend | FastAPI + uvicorn | 0.111 / 0.30 |
| Solver | Google OR-Tools CP-SAT | 9.14 |
| Database | MongoDB (Atlas in production) | 6+ |
| Hosting | Render | — |

---

## Project Structure

```
School_TimeTable_Generator/
├── backend/
│   ├── generator.py          # CP-SAT solver engine + relaxation diagnostics
│   ├── models.py             # Data models: InputTeacher, Teacher, Timetable
│   ├── server.py             # FastAPI app, all routes, Pydantic schemas
│   ├── test_validation.py    # 6 unit tests for /validate-edit endpoint
│   ├── test_solver.py        # 3 unit tests for solver constraints
│   ├── Procfile              # Render deployment: uvicorn command
│   ├── .python-version       # 3.11.9
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── home/         # Landing page (GSAP hero) + guide
│   │   │   ├── auth/         # Clerk login / signup
│   │   │   ├── dashboard/    # Saved timetable list + version dropdown
│   │   │   ├── generate/     # 4-step wizard (GeneratePage → AddTeacher → TimetableDisplay → EditTimetable)
│   │   │   └── components/   # Shared: NavBar, WizardSteps, BorderGlow, SideRays
│   │   ├── utils/
│   │   │   ├── fetchWithAuth.js   # Clerk Bearer token wrapper
│   │   │   └── subjectColor.js    # Deterministic subject-to-color hash (10 colors)
│   │   ├── styles/           # Canvas/WebGL: DotGrid, Orb
│   │   ├── index.css         # Tailwind v4 entry + global styles + @media print (A4 landscape)
│   │   └── main.jsx          # ClerkProvider + BrowserRouter root
│   ├── .env.development      # Dev env vars (committed, no secrets)
│   ├── vite.config.js
│   └── package.json
│
├── .gitignore
├── LICENSE
└── README.md
```

---

## Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Node.js | 18.x |
| npm | 9.x |
| Python | 3.11.9 |
| pip | 23.x |
| MongoDB | 6.x |

---

## Quick Start

### 1. Clone

```bash
git clone <repository-url>
cd School_TimeTable_Generator
```

### 2. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

API available at `http://localhost:8000`. Swagger UI at `http://localhost:8000/docs`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:5173`.

### 4. Environment Variables

**`backend/.env`** (create manually — not committed):

```env
MONGO_URI=mongodb://localhost:27017/timetableDB
FRONTEND_URL=http://localhost:5173
```

**`frontend/.env.development`** (already committed):

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

Get a Clerk publishable key from [clerk.com](https://clerk.com) — free tier is sufficient for development.

---

## Timetable Generation Workflow

```
Step 1 — GeneratePage
  Title, working days (1–6), periods/day (1–12)
  Chip-based input for class names and subjects
  Optional: drag-and-drop Excel upload (auto-fills all fields)

Step 2 — AddTeacher
  Teacher profiles: name, subjects, primary subject, lab subject
  Period workloads: class × subject × periods/week
  Availability matrix: mark blocked day/period slots
  Click "Generate" → POST /generate → CP-SAT solver (≤60s)
  On INFEASIBLE → DiagnosticsPanel shows categorized conflicts

Step 3 — TimetableDisplay
  Toggle Class View / Teacher View
  Set start time + period duration → auto-computed time ranges
  Teacher workload summary with over-limit highlighting
  Export: PDF · Excel · iCalendar · Print

Step 4 — EditTimetable
  Drag-and-drop or click×2 to swap cells
  Ctrl+Z undo (up to 20 steps) · Ctrl+S to save
  POST /validate-edit before any save
  Save modal: overwrite current draft or save as new version (v1, v2, v3...)
```

---

## Architecture

```
Browser (React + Vite)
        │  JSON over HTTPS
        ▼
   FastAPI (Python 3.11)
        │
        ├── POST /generate ─────► CP-SAT Solver (OR-Tools)
        │                          └── INFEASIBLE → relaxation diagnostics
        ├── POST /validate-edit ─► 7-rule constraint checker
        ├── POST /add ──────────► MongoDB insert
        ├── PUT  /update-timetable/{id} ► MongoDB update
        ├── GET  /get-timetables/{userId}► MongoDB query
        ├── GET  /get-timetable/{id} ──► MongoDB findOne
        └── DELETE /delete-timetable/{id}► MongoDB delete
```

---

## Running Tests

```bash
cd backend
python -m unittest test_validation.py test_solver.py -v
# Ran 9 tests in ~0.1s — OK
```

See [backend/README.md](backend/README.md) for full test descriptions.

---

## Deployment

Both services are hosted on **Render** and deploy automatically from the `main` branch.

| Service | Type | URL |
|---------|------|-----|
| Frontend | Static Site | https://timetable-generator-t4h3.onrender.com |
| Backend | Web Service | https://timetable-generator-backend-xy8g.onrender.com |

See [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md) for full production deployment instructions.

---

## Environment Variables Reference

### Backend

| Variable | Required | Example |
|----------|----------|---------|
| `MONGO_URI` | Yes | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `FRONTEND_URL` | Yes | `https://timetable-generator-t4h3.onrender.com` |

### Frontend

| Variable | Required | Example |
|----------|----------|---------|
| `VITE_API_BASE_URL` | Yes | `https://timetable-generator-backend-xy8g.onrender.com` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | `pk_live_...` |

---

## License

See [LICENSE](LICENSE) for details.
