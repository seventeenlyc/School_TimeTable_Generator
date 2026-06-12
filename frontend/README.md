# Frontend — School Timetable Generator

A **React 19 + Vite 7** single-page application for generating, editing, and managing school timetables. Features a dark glass-morphism design system built with Tailwind CSS v4, GSAP entrance animations on the landing page, and a 4-step wizard that guides admins from configuration through to export.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Installation](#installation)
4. [Environment Variables](#environment-variables)
5. [Development](#development)
6. [Production Build](#production-build)
7. [Routing](#routing)
8. [Page Architecture](#page-architecture)
9. [Shared Components](#shared-components)
10. [Authentication](#authentication)
11. [Utilities](#utilities)
12. [Design System](#design-system)
13. [Export Features](#export-features)
14. [Keyboard Shortcuts](#keyboard-shortcuts)
15. [Print Support](#print-support)
16. [Deployment](#deployment)

---

## Tech Stack

| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.1 | UI framework |
| react-dom | 19.1 | DOM rendering |
| vite | 7.0 | Build tool + dev server |
| tailwindcss | 4.3 | Utility CSS (via @tailwindcss/vite — no config file needed) |
| @tailwindcss/vite | 4.3 | Vite plugin for Tailwind v4 |
| gsap | 3.13 | Hero section entrance animations |
| @clerk/clerk-react | 5.33 | Authentication |
| react-router-dom | 7.6 | Client-side routing |
| react-hot-toast | 2.5 | Toast notifications |
| lucide-react | 0.525 | Icon library |
| xlsx (SheetJS) | 0.18 | Excel import and export |
| jspdf | 3.0 | PDF generation |
| html2canvas | 1.4 | DOM-to-canvas for PDF rendering |
| file-saver | 2.0 | Binary file download trigger |
| ogl | 1.0 | WebGL (Orb + SideRays background effects) |
| bootstrap | 5.3 | Legacy utility classes (NavBar) |
| @mui/icons-material | 7.2 | Additional icons |

---

## Project Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── home/
│   │   │   ├── HomePage.jsx           # Landing page — GSAP hero, feature cards, modals
│   │   │   └── GuidePage.jsx          # Interactive guide — BorderGlow feature cards
│   │   ├── auth/
│   │   │   ├── LoginPage.jsx          # Clerk <SignIn> component
│   │   │   └── SignUpPage.jsx         # Clerk <SignUp> component
│   │   ├── dashboard/
│   │   │   └── DashbordPage.jsx       # Saved timetables — version dropdown, delete, load
│   │   ├── generate/
│   │   │   ├── GeneratePage.jsx       # Step 1 — chip inputs, Excel upload, settings
│   │   │   ├── AddTeacher.jsx         # Step 2 — teacher profiles, availability matrix, generate
│   │   │   ├── TimetableDisplay.jsx   # Step 3 — view, export, workload summary
│   │   │   └── components/
│   │   │       ├── EditTimetable.jsx  # Step 4 — drag-drop editor, undo, save modal
│   │   │       └── DropdownChecklist.jsx
│   │   └── components/
│   │       ├── NavBar.jsx             # Persistent top navigation + Clerk user button
│   │       ├── WizardSteps.jsx        # 4-step breadcrumb indicator (shared across wizard)
│   │       ├── BorderGlow.jsx         # Glassmorphic animated-border card wrapper
│   │       └── SideRays.jsx          # WebGL ambient light rays (homepage background)
│   ├── utils/
│   │   ├── fetchWithAuth.js           # Injects Clerk Bearer token into all API calls
│   │   └── subjectColor.js            # Deterministic subject-name → color hash (10-palette)
│   ├── styles/
│   │   ├── DotGrid/DotGrid.jsx        # Canvas animated dot-grid background
│   │   └── orb/Orb.jsx               # WebGL ambient orb (homepage)
│   ├── App.jsx                        # React Router route definitions
│   ├── index.css                      # @import "tailwindcss" + global styles + @media print
│   └── main.jsx                       # ClerkProvider + BrowserRouter + React root
│
├── .env.development                   # Dev env vars (safe to commit — no secrets)
├── .env                               # Production env vars (committed with live API URL)
├── vite.config.js                     # Vite + Tailwind v4 plugin + chunk size limit
└── package.json
```

---

## Installation

```bash
cd frontend
npm install
```

Node.js 18 or later is required.

---

## Environment Variables

All variables must be prefixed with `VITE_` to be available in the browser bundle.

### Development (`.env.development`)

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

### Production (`.env` or `.env.production`)

```env
VITE_API_BASE_URL=https://timetable-generator-backend-xy8g.onrender.com
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_live_key_here
```

Vite inlines these at build time — they are not runtime secrets. Never store `CLERK_SECRET_KEY` (backend-only) in frontend env files.

---

## Development

```bash
npm run dev
# Starts dev server at http://localhost:5173
# HMR enabled — CSS and component changes apply without full reload
```

The backend must also be running at `http://localhost:8000` for API calls to work.

---

## Production Build

```bash
npm run build
# Output: dist/
# dist/index.html + dist/assets/[hash].js + dist/assets/[hash].css
```

Preview the production build locally before deploying:

```bash
npm run preview
# Serves dist/ at http://localhost:4173
```

**Expected build output:** ~1.7 MB JS (xlsx + gsap + jsPDF are large). The chunk size warning is expected and acceptable. To reduce it, dynamic imports can be added for the export libraries if needed.

---

## Routing

Defined in `src/App.jsx`:

| Route | Component | Auth Required |
|-------|-----------|:---:|
| `/` | `HomePage` | No |
| `/guide` | `GuidePage` | No |
| `/login` | `LoginPage` | No |
| `/sign-up` | `SignUpPage` | No |
| `/sso-callback` | `AuthenticateWithRedirectCallback` | No |
| `/dashboard` | `DashbordPage` | Yes |
| `/generate` | `GeneratePage` | Yes |
| `/generate/add-teachers` | `AddTeacher` | Yes |
| `/display/:id` | `TimetableDisplay` | Yes |
| `/edit-timetable` | `EditTimetable` | Yes |

Protected routes use Clerk's `<RedirectToSignIn>` when the user is not authenticated.

---

## Page Architecture

### `HomePage` — Landing Page

- GSAP timeline on mount: hero headline, subtitle, CTA buttons, and feature cards stagger in with `fromTo` (opacity 0→1, y 30→0)
- 5 refs attached to animated elements; `gsap.timeline()` created in `useEffect`
- Modals: About, How It Works, Contact, Terms, Language — all rendered inline with CSS transitions
- Background: `<Orb>` WebGL sphere + `<SideRays>` ambient light + CSS drift animations on floating orbs

---

### `GeneratePage` — Wizard Step 1

**Chip-based class/subject input:**
- Type a name in the input field → press Enter or click `+` → a chip renders with an `×` delete button
- State: `classes: []`, `subjects: []`, `classInput: ""`, `subjectInput: ""`
- `addChip(value, setter, inputSetter)` handles duplicates and empty strings

**Excel bulk import:**
- Dashed drop zone accepts `.xlsx` drag-and-drop or click-to-upload
- Parses 5 sheets: Setup, Classes, Subjects, Teachers, Workloads
- Auto-populates all state; toast prompts user to navigate to AddTeacher
- `handleDownloadTemplate()` generates a pre-formatted template via SheetJS

**Validation before proceeding:**
- Working days: 1–6
- Periods: 1–12
- At least 1 class and 1 subject required

State is passed to `AddTeacher` via React Router `navigate()` with `state`.

---

### `AddTeacher` — Wizard Step 2

**Left sidebar — Teacher directory:**
- Search bar filters by name
- Each card: colored initials avatar (HSL from name hash), main subject tag, period count, readiness progress bar
- `N/M ready` counter where "ready" = at least one period workload configured
- Click to select; delete button on hover

**Right panel — Teacher editor:**
- Basic fields: Name, Subjects Taught (dropdown checklist), Primary Subject (dropdown), Lab Subject (optional)
- Class assignment: if this teacher is a class teacher, select their assigned grade
- Period workloads table: `Class | Subject | Periods/Week | Delete` — add rows with the + button
- Availability matrix: `workingDays × periods` grid of toggle cells
  - Each cell is 44×44px with hover and click toggle
  - Blocked = 🔒 red background; available = ✓ teal background
  - Legend shown below the grid

**Generate flow:**
- Collects all teacher data and POSTs to `POST /generate`
- Shows loading spinner on the Generate button
- On success: navigates to TimetableDisplay with the result in router state
- On INFEASIBLE: renders `DiagnosticsPanel` inline

**DiagnosticsPanel:**

Categorizes `conflict_diagnostics` strings from the API by pattern match:

| Icon | Category | Pattern |
|------|---------|---------|
| 👥 | Teacher Double-Booking | `"is double-booked"` |
| 🚫 | Unavailability Violation | `"was scheduled on blocked slot"` |
| 🧪 | Lab Room Conflict | `"Lab Room.*double-booked"` |
| 🔗 | Lab Block Violation | `"not scheduled consecutively"` |
| 📊 | Period Count Shortage | `"has only \d+ periods.*requires"` |
| ⚠️ | Daily Subject Limit | `"exceeding the daily limit"` |
| 🎓 | Class Teacher Priority | `"Class Teacher.*not assigned the first period"` |

---

### `TimetableDisplay` — Wizard Step 3

**View controls:**
- Toggle: Class View / Teacher View
- Selector: individual class/teacher or "All"
- When "All" selected: horizontal scrollable tab strip appears; clicking a tab calls `scrollIntoView()` on that section

**Period time display:**
- `startTime` state (default `"08:30"`) and `periodDuration` state (default `50` minutes)
- `getPeriodTime(periodIndex)` computes `HH:MM–HH:MM` for each period header
- Inputs shown in the export bar; updates all period headers live

**Subject colors:**
- `getSubjectColor(subjectName)` from `src/utils/subjectColor.js` applied to every cell
- Returns `{ bg, border, text }` from a 10-color palette; deterministic by subject name hash
- Consistent with EditTimetable view

**Teacher workload summary:**
- `computeWorkloads()` scans `teacher_timetable` and counts assigned periods
- Progress bar per teacher: teal < 80%, amber ≥ 80%, red > max with "⚠ Over limit" badge

**Export buttons** (all show spinner + "Generating…" while processing):
- **Export PDF** — `html2canvas(#timetable-container)` → `jsPDF` → `file-saver`
- **Export Excel** — SheetJS `XLSX.utils.aoa_to_sheet` per class → workbook → `file-saver`
- **Export iCal** — generates `BEGIN:VEVENT … RRULE:FREQ=WEEKLY … END:VEVENT` blocks → `.ics` download
- **Print** — calls `window.print()`; `@media print` CSS in `index.css` handles layout

---

### `EditTimetable` — Wizard Step 4

**Cell swap — two methods:**

1. **Click × 2** — Click first cell (highlights teal), click second cell → validates + swaps
2. **Drag-and-drop** — `draggable` attribute on each cell; `dragstart` / `dragover` / `drop` handlers
   - Dragged cell: 40% opacity + teal ring on source
   - Drop target: teal ring highlight on hover
   - `handlePeriodSwapDirect(from, to)` performs the swap after validation

**Undo:**
- `history` state array (up to 20 snapshots of `timetable`)
- `handleUndo()` pops the last snapshot
- Badge shows `↩ N undos available` when history is non-empty

**Keyboard shortcuts** (always-visible hint bar below header):
- `Ctrl+Z` / `Cmd+Z` — undo
- `Ctrl+S` / `Cmd+S` — open save modal

**Save flow:**
1. POSTs current timetable to `POST /validate-edit`
2. On error: toast per violation, modal blocked
3. On valid: save modal with two options:
   - **Overwrite current draft** — `PUT /update-timetable/:id`
   - **Save as new version** — `POST /add` with auto-incremented `versionName` (v1 → v2 → v3) and same `parentGroupId`

---

## Shared Components

### `WizardSteps` (`src/pages/components/WizardSteps.jsx`)

```jsx
<WizardSteps current={2} />
// current: 1=Setup, 2=Teachers, 3=Generate, 4=Review
```

Renders 4 step bubbles (32×32px circles) connected by horizontal lines:
- Completed steps (< current): teal gradient fill + ✓ checkmark
- Active step (= current): teal glow ring
- Upcoming steps (> current): muted gray border

Used at the top of GeneratePage, AddTeacher, TimetableDisplay, and EditTimetable.

---

### `BorderGlow` (`src/pages/components/BorderGlow.jsx`)

Glassmorphic card wrapper with animated gradient border glow on hover. Used on GuidePage feature cards.

```jsx
<BorderGlow>
  <div className="p-6">Card content</div>
</BorderGlow>
```

---

### `SideRays` (`src/pages/components/SideRays.jsx`)

WebGL-based ambient light ray effect rendered on a canvas. Props: `speed`, `rayColor1`, `rayColor2`, `intensity`, `spread`, `origin`.

---

### `NavBar` (`src/pages/components/NavBar.jsx`)

Persistent top navigation with logo, links (Home, Guide, Dashboard), and Clerk `<UserButton>`. Hides on auth pages.

---

## Authentication

Authentication is handled by **Clerk**. The `ClerkProvider` wraps the entire app in `main.jsx`:

```jsx
<ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
  <BrowserRouter>
    <App />
  </BrowserRouter>
</ClerkProvider>
```

All protected API calls use `fetchWithAuth`:

```javascript
// src/utils/fetchWithAuth.js
export const fetchWithAuth = async (token, url, options = {}) => {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
};
```

Usage pattern in any component:

```javascript
const { getToken } = useAuth();
const { user } = useUser();

const token = await getToken();
const res = await fetchWithAuth(token, `${API}/get-timetables/${user.id}`);
```

---

## Utilities

### `subjectColor.js`

Returns a consistent color object for any subject name:

```javascript
import { getSubjectColor } from "../../utils/subjectColor";

const col = getSubjectColor("Mathematics");
// { bg: "rgba(45,212,191,0.15)", border: "#2dd4bf", text: "#2dd4bf" }
```

The 10-color palette covers: teal, purple, orange, sky, rose, indigo, green, yellow, fuchsia, emerald.

The hash function (`h = (h * 31 + charCode) >>> 0`) is stable — the same subject name always maps to the same color for every user and every session.

---

## Design System

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Primary teal | `#57f1db` | Active states, borders, accents |
| Secondary purple | `#a78bfa` | Secondary accents |
| Sky blue | `#38bdf8` | Tertiary accents |
| Success | `#10b981` | Positive feedback |
| Warning | `#f59e0b` | Partial states, amber warnings |
| Error | `#ef4444` | Conflicts, over-limit |
| Background | `#030814` | Page background |
| Card | `rgba(10,18,36,0.45)` | Glass card surface |

### Typography

```css
font-family: 'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif;
```

### Glass Card Pattern

```css
background: rgba(10, 18, 36, 0.45);
border: 1px solid rgba(87, 241, 219, 0.12);
border-radius: 24px;
backdrop-filter: blur(24px);
box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
```

### Tailwind v4 Setup

No `tailwind.config.js` is required. Configuration is in `vite.config.js`:

```javascript
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { chunkSizeWarningLimit: 1500 },
});
```

And in `index.css`:

```css
@import "tailwindcss";
```

---

## Export Features

### Excel Template (5 sheets)

| Sheet | Required Columns |
|-------|----------------|
| Setup | Title, WorkingDays, PeriodsPerDay |
| Classes | ClassName |
| Subjects | SubjectName |
| Teachers | TeacherName, MainSubject, LabSubject, AssignedClass, UnavailableSlots |
| Workloads | TeacherName, ClassName, SubjectName, NoOfPeriods |

`UnavailableSlots` format: `"0,0;0,1"` — semicolon-separated `dayIndex,periodIndex` pairs.

### iCalendar Format

Each timetable cell becomes a weekly recurring event:

```
BEGIN:VEVENT
DTSTART;TZID=Asia/Kolkata:20260112T083000
DTEND;TZID=Asia/Kolkata:20260112T092000
RRULE:FREQ=WEEKLY
SUMMARY:Mathematics - Class 10A
DESCRIPTION:Teacher: Mr. Green
END:VEVENT
```

Start/end times are computed from the `startTime` and `periodDuration` inputs in TimetableDisplay.

---

## Keyboard Shortcuts

Available in `EditTimetable`:

| Shortcut | Action |
|---------|--------|
| `Ctrl+Z` / `Cmd+Z` | Undo last cell swap |
| `Ctrl+S` / `Cmd+S` | Open save modal |

A hint bar below the page header always shows available shortcuts so they are discoverable without reading documentation.

---

## Print Support

`src/index.css` includes a `@media print` block:

```css
@media print {
  /* Hide everything */
  body > *:not(#root) { display: none !important; }
  nav, button, .no-print { display: none !important; }

  /* Show only the timetable */
  #timetable-container { display: block !important; }

  /* Force white background, black text */
  * { background: white !important; color: black !important; }

  @page { size: A4 landscape; margin: 15mm; }
}
```

The **Print** button in TimetableDisplay calls `window.print()`. The browser's print dialog will use these styles automatically.

---

## Deployment

### Render (current hosting)

Render auto-deploys from the `main` branch. Build command: `npm install && npm run build`. Publish directory: `dist`.

**Environment variables to set in Render dashboard:**

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://timetable-generator-backend-xy8g.onrender.com` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Live Clerk publishable key |

### Self-hosted (Nginx)

```bash
npm run build
cp -r dist/ /var/www/timetable/
```

```nginx
server {
    listen 443 ssl;
    server_name timetable.yourdomain.com;

    root /var/www/timetable;
    index index.html;

    # SPA fallback — all routes served by index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Aggressive caching for hashed assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

The `try_files … /index.html` fallback is required for client-side routing to work on hard refresh.

### Vercel / Netlify

```bash
npm run build
# Deploy dist/ folder
# Set VITE_API_BASE_URL and VITE_CLERK_PUBLISHABLE_KEY in the dashboard
# Add a rewrite rule: /* → /index.html (for SPA routing)
```

### Production Checklist

- [ ] `VITE_API_BASE_URL` uses HTTPS (Clerk requires secure origins in production)
- [ ] `VITE_CLERK_PUBLISHABLE_KEY` is the live key (`pk_live_...`), not the test key
- [ ] Clerk dashboard → Allowed origins includes your production domain
- [ ] Backend `FRONTEND_URL` matches this frontend's origin exactly
- [ ] `npm run build` completes with zero errors (chunk size warning is acceptable)
- [ ] SPA fallback (`try_files` / rewrite rule) is configured on the host
- [ ] HTTPS certificate is active (required by Clerk)
