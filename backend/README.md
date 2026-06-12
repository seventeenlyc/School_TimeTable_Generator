# Backend — School Timetable Generator API

A **FastAPI** backend that generates clash-free school timetables using **Google OR-Tools CP-SAT** constraint programming, validates manual edits against scheduling rules, and persists timetables to MongoDB with versioning support.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Running the Server](#running-the-server)
6. [API Reference](#api-reference)
7. [Solver Architecture](#solver-architecture)
8. [Constraint System](#constraint-system)
9. [Infeasibility Diagnostics](#infeasibility-diagnostics)
10. [Data Models](#data-models)
11. [Testing](#testing)
12. [Production Deployment](#production-deployment)

---

## Tech Stack

| Package | Version | Purpose |
|---------|---------|---------|
| Python | 3.11.9 | Runtime |
| FastAPI | 0.111.0 | Web framework |
| uvicorn | 0.30.1 | ASGI server |
| ortools | 9.14.6206 | CP-SAT constraint solver |
| pydantic | 1.10.19 | Request/response validation |
| pymongo | 4.7.2 | MongoDB driver |
| python-dotenv | 1.0.1 | Environment variable loading |
| pytz | 2024.1 | Timezone handling (IST timestamps) |
| python-multipart | 0.0.9 | Form data parsing |

---

## Project Structure

```
backend/
├── server.py          # FastAPI app, all routes, Pydantic request/response schemas
├── generator.py       # CP-SAT solver engine + relaxation diagnostic model (714 lines)
├── models.py          # Core data models: InputTeacher, Teacher dataclass, Timetable dataclass
├── test_validation.py # 6 unit tests for /validate-edit constraint checks
├── test_solver.py     # 3 unit tests for solver constraints
├── Procfile           # Render deployment command
├── .python-version    # 3.11.9
└── requirements.txt   # All Python dependencies with pinned versions
```

---

## Installation

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

Python 3.11.9 is required. Using a different minor version may cause ortools compatibility issues.

---

## Configuration

Create `backend/.env` (this file is git-ignored):

```env
MONGO_URI=mongodb://localhost:27017/timetableDB
FRONTEND_URL=http://localhost:5173
```

**Production values:**
- `MONGO_URI` → MongoDB Atlas connection string (include `?retryWrites=true&w=majority`)
- `FRONTEND_URL` → Exact origin of your deployed frontend (no trailing slash)

---

## Running the Server

```bash
# Development (auto-reload on file changes)
uvicorn server:app --reload --port 8000

# Production (see Production Deployment section)
python -m uvicorn server:app --host 0.0.0.0 --port 8000
```

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **Health check:** `GET http://localhost:8000/` → `{"message": "Timetable Generator API"}`

---

## API Reference

### `GET /`

Health check. Returns `{"message": "Timetable Generator API"}`. No auth required.

---

### `POST /generate`

Generates a clash-free timetable using the CP-SAT solver. Solver timeout is 60 seconds.

**Request Body:**

```json
{
  "workingDays": 5,
  "periods": 8,
  "classes": ["10A", "10B", "11A"],
  "subjects": ["Mathematics", "Physics", "CS Lab"],
  "userId": "user_clerk_id",
  "title": "Spring 2026",
  "versionName": "v1",
  "parentGroupId": null,
  "teachers": [
    {
      "name": "Mr. Green",
      "subjects": ["Mathematics"],
      "mainSubject": "Mathematics",
      "labPeriod": null,
      "assigned_class": "10A",
      "unavailable_slots": [[0, 0], [0, 1]],
      "periods": [
        { "class_name": "10A", "subject": "Mathematics", "noOfPeriods": 5 },
        { "class_name": "10B", "subject": "Mathematics", "noOfPeriods": 4 }
      ]
    }
  ]
}
```

`unavailable_slots` is a list of `[dayIndex, periodIndex]` pairs (both 0-indexed).

**Success Response `200`:**

```json
{
  "status": "OK",
  "class_timetable": {
    "10A": [
      ["Mathematics (Mr. Green)", "Free", "Physics (Ms. Blue)", ...],
      ...
    ]
  },
  "teacher_timetable": {
    "Mr. Green": [
      ["10A", "Free", "10B", ...],
      ...
    ]
  }
}
```

Outer array = days, inner array = periods.

**Infeasibility Response `200`:**

```json
{
  "status": "INFEASIBLE",
  "message": "[Error] No feasible timetable solution exists...",
  "error_type": "INFEASIBLE_SOLUTION",
  "error_details": {
    "conflict_diagnostics": [
      "Teacher 'Mr. Green' was scheduled on blocked slot Monday, Period 1 for Class 10A.",
      "Specialized Lab Room for 'CS Lab' was double-booked on Monday, Period 1 by classes: 10A, 10B."
    ]
  }
}
```

**Input Validation Error `200`** (caught before the solver runs):

```json
{
  "status": "ERROR",
  "error_type": "INPUT_VALIDATION_FAILED",
  "message": "Total required periods (52) exceed available slots (40).",
  "error_details": { "validation_type": "PERIODS_OVERFLOW" }
}
```

---

### `POST /validate-edit`

Validates a manually edited timetable against all 7 constraint rules before saving.

**Request Body:**

```json
{
  "class_timetable": { "10A": [["Mathematics (Mr. Green)", ...], ...] },
  "teacher_timetable": { "Mr. Green": [["10A", ...], ...] },
  "workingDays": 5,
  "periods": 8,
  "classes": ["10A", "10B"],
  "subjects": ["Mathematics", "CS Lab"],
  "teachers": [
    { "name": "Mr. Green", "unavailable_slots": [[0, 0]], "periods": [...], ... }
  ]
}
```

**Validation rules applied (in order):**

1. Teacher unavailability — teacher not scheduled in their blocked slots
2. Teacher double-booking — same teacher not in two classes at the same time
3. Daily subject limit — max 2 periods of the same subject per class per day
4. Lab consecutive blocks — lab subjects must be in adjacent pairs
5. Lab room double-booking — max 1 class using the same lab subject per period
6. Class teacher first period — class teacher's main subject in at least one first period (warning only)

**Valid Response `200`:**

```json
{ "status": "valid", "errors": [], "warnings": [] }
```

**Error Response `200`:**

```json
{
  "status": "error",
  "errors": ["Teacher 'Mr. Green' is scheduled during unavailable slot: Monday, Period 1"],
  "warnings": []
}
```

---

### `POST /add`

Saves a generated timetable to MongoDB. Adds `createdAt` timestamp (IST). Returns the inserted document with its `_id`.

---

### `GET /get-timetables/{user_id}`

Returns all timetables for a given user, sorted by `createdAt` descending. Used by the dashboard.

---

### `GET /get-timetable/{timetable_id}`

Returns a single timetable document by its MongoDB ObjectId.

---

### `PUT /update-timetable/{timetable_id}`

Updates an existing timetable document. Used for both overwrite and versioned saves from the edit modal.

---

### `DELETE /delete-timetable/{timetable_id}`

Deletes a timetable document. Returns `{"message": "Deleted"}` or `{"message": "Not Found"}`.

---

## Solver Architecture

### Primary Model — `generate_with_teacher_list()`

The solver creates one integer decision variable per `(class, day, period)` slot. The variable's domain is the set of valid assignment IDs plus 0 (Free).

```python
# Conceptually:
timetable[class][day][period] = assignment_id  # or 0 for Free
```

Each assignment ID maps to a unique `(teacher, subject, class)` triple. The solver then enforces hard constraints across these variables and calls `solver.Solve()` with a 60-second timeout.

**Hard constraints:**

| Constraint | Description |
|-----------|-------------|
| Teacher uniqueness | A teacher can appear in at most one class per time slot |
| Period count | Each class-subject pair receives exactly its required number of periods |
| Daily subject limit | No class has more than 2 periods of the same subject per day |
| Lab consecutive | Lab subjects are always scheduled in adjacent period pairs |
| Lab room occupancy | At most 1 class may use a given lab subject per time slot |
| Teacher unavailability | Blocked slots are excluded from the solver's domain |
| Valid assignments only | Only pre-approved teacher-subject-class combinations are considered |

**Soft constraint (penalized):**

- Class teacher main subject assigned to at least one first period of a day

**Return values:**

- `cp_model.OPTIMAL` or `cp_model.FEASIBLE` → timetable returned
- `cp_model.INFEASIBLE` → `run_relaxation_diagnostics()` called → diagnostics returned

---

### Input Validation — `validate_input_constraints()`

Runs before the solver to catch obvious logical errors:

| Error Type | Check |
|-----------|-------|
| `PERIODS_OVERFLOW` | Total required periods > available slots (days × periods) |
| `DAILY_SUBJECT_LIMIT` | Any subject assigned more than 2 × working_days periods |
| `TEACHER_OVERLOAD` | Teacher assigned more periods than available slots |
| `LAB_PERIOD_ODD` | Lab subjects must have an even period count (consecutive pairs) |
| `MAIN_SUBJECT_MISSING` | Class teacher has no workload entry for their main subject |
| `DUPLICATE_SUBJECT` | Same subject assigned to multiple teachers for the same class |

---

### Relaxation Diagnostic Model — `run_relaxation_diagnostics()`

When the primary solver returns INFEASIBLE, this function builds a second CP-SAT model where every hard constraint is replaced by a penalized slack variable. Minimizing total penalty identifies which constraints are violated and by how much.

**Penalty weights:**

| Penalty Category | Weight |
|-----------------|--------|
| Subject period count shortage | 10,000 |
| Teacher double-booking | 100 |
| Teacher unavailability violation | 100 |
| Lab room double-booking | 100 |
| Lab non-consecutive scheduling | 100 |
| Daily subject limit excess | 100 |
| Class teacher first period missed | 100 |

The function returns a list of human-readable diagnostic strings attached to the API response as `conflict_diagnostics`.

---

## Infeasibility Diagnostics

The frontend `DiagnosticsPanel` component in `AddTeacher.jsx` classifies diagnostic messages by pattern:

| Pattern Match | Icon | Category |
|--------------|------|---------|
| `"is double-booked"` | 👥 | Teacher Double-Booking |
| `"was scheduled on blocked slot"` | 🚫 | Unavailability Violation |
| `"Lab Room.*double-booked"` | 🧪 | Lab Room Conflict |
| `"not scheduled consecutively"` | 🔗 | Lab Block Violation |
| `"has only \d+ periods.*requires"` | 📊 | Period Count Shortage |
| `"exceeding the daily limit"` | ⚠️ | Daily Subject Limit |
| `"Class Teacher.*not assigned the first period"` | 🎓 | Class Teacher Priority |

---

## Data Models

### `InputTeacher` (Pydantic — request)

```python
class InputTeacher(BaseModel):
    name: str
    subjects: List[str]
    mainSubject: str
    labPeriod: Optional[str] = None
    assigned_class: Optional[str] = None
    unavailable_slots: Optional[List[List[int]]] = []
    periods: List[PeriodAssignment]

class PeriodAssignment(BaseModel):
    class_name: str
    subject: str
    noOfPeriods: int
```

### `Teacher` (dataclass — internal solver representation)

```python
@dataclass
class Teacher:
    name: str
    subjects_by_class: Dict[str, Dict[str, int]]  # {class: {subject: periods}}
    main_subject: str
    assigned_class: Optional[str] = None
    lab_subjects: set = field(default_factory=set)
    unavailable_slots: List[List[int]] = field(default_factory=list)
```

### `EditValidationRequest` (Pydantic — validate-edit)

```python
class EditValidationRequest(BaseModel):
    class_timetable: Dict[str, List[List[str]]]
    teacher_timetable: Dict[str, List[List[str]]]
    workingDays: int
    periods: int
    classes: List[str]
    subjects: List[str]
    teachers: List[TeacherInput]
```

---

## Testing

```bash
# Run all 9 tests with verbose output
python -m unittest test_validation.py test_solver.py -v
```

### `test_validation.py` — 6 tests

| Test | What it verifies |
|------|----------------|
| `test_validate_edit_valid` | A correctly formed timetable passes all 7 checks |
| `test_validate_edit_double_booking` | Teacher in two classes at the same time is caught |
| `test_validate_edit_daily_subject_cap` | More than 2 periods of a subject in one day is caught |
| `test_validate_edit_isolated_lab_period` | A lone lab period not in a consecutive pair is caught |
| `test_validate_edit_teacher_unavailability` | Teacher scheduled in a blocked slot is caught |
| `test_validate_edit_lab_room_double_booking` | Two classes using the same lab simultaneously is caught |

### `test_solver.py` — 3 tests

| Test | What it verifies |
|------|----------------|
| `test_teacher_unavailability_respected` | Solver never places a teacher in a blocked slot |
| `test_lab_room_double_booking_prevented` | Solver returns INFEASIBLE when lab room conflict is unavoidable |
| `test_infeasibility_diagnostics_returned` | Diagnostic messages are returned when solver fails |

---

## Production Deployment

The backend is deployed on **Render** using the `Procfile`:

```
web: python -m uvicorn server:app --host 0.0.0.0 --port 8000
```

Render detects `Procfile` and `.python-version` automatically.

**Environment variables to set in Render dashboard:**

| Variable | Value |
|----------|-------|
| `MONGO_URI` | Atlas connection string (`mongodb+srv://...`) |
| `FRONTEND_URL` | Production frontend URL (e.g. `https://timetable-generator-t4h3.onrender.com`) |

**Production checklist:**

- [ ] `MONGO_URI` uses Atlas (not local MongoDB) with auth credentials
- [ ] `FRONTEND_URL` exactly matches the deployed frontend origin (no trailing slash)
- [ ] `.env` file is not committed to the repository
- [ ] Render web service is set to Python 3.11.9 (matches `.python-version`)
- [ ] MongoDB Atlas IP allowlist includes Render's outbound IP ranges (or is set to `0.0.0.0/0`)
- [ ] CORS: only `FRONTEND_URL` and `localhost` dev origins are allowed (not `*`)

**Manual production run (non-Render):**

```bash
pip install gunicorn
gunicorn server:app \
  -w 4 \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120
```

Set `--workers` to `(2 × CPU cores) + 1`. The solver can run for up to 60 seconds, so `--timeout 120` provides a safe margin.
