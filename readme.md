# Institutional Event Resource Management System

**Status:** ✅ Complete and Tested
- Full-stack system with backend and frontend
- Comprehensive test suite covering all functionality
- All issues fixed and verified

Tech Stack:
Backend:
- Node.js
- Express
- SQLite
- JWT Authentication
- bcrypt for password hashing
- CORS enabled

Frontend:
- React (Vite)
- Axios
- React Router
- Basic CSS (no external UI library)

=========================================
SYSTEM OVERVIEW
=========================================

The system manages institutional event planning with strict role-based workflow.

Roles:
- COORDINATOR
- HOD
- DEAN
- HEAD
- ADMIN

Approval Flow:
COORDINATOR → HOD → DEAN → HEAD

Final approval triggers allocation validation.

=========================================
BACKEND REQUIREMENTS
=========================================

Folder structure:

backend/
  server.js
  db.js
  middleware/auth.js
  routes/
    authRoutes.js
    eventRoutes.js
    approvalRoutes.js
    adminRoutes.js
  services/
    allocationService.js
    conflictService.js

=========================================
DATABASE SCHEMA (SQLite)
=========================================

Users:
- id
- name
- email (unique)
- password
- role (COORDINATOR, HOD, DEAN, HEAD, ADMIN)

Venues:
- id
- name
- capacity

Resources:
- id
- name
- total_quantity

Events:
- id
- title
- department
- coordinator_id
- venue_id
- start_time
- end_time
- participant_count
- status (DRAFT, SUBMITTED, HOD_APPROVED, DEAN_APPROVED, HEAD_APPROVED, REJECTED, RUNNING, COMPLETED)
- rejection_reason

Event_Resources:
- id
- event_id
- resource_id
- quantity

=========================================
BACKEND FUNCTIONAL REQUIREMENTS
=========================================

1. Authentication
- Register
- Login
- JWT token
- Role-based middleware

2. Coordinator can:
- Create event
- Add resources to event
- Submit event (status = SUBMITTED)
- View own events
- Mark event RUNNING
- Mark event COMPLETED

3. HOD can:
- View department events
- Approve SUBMITTED → HOD_APPROVED
- Reject with reason

4. DEAN can:
- Approve HOD_APPROVED → DEAN_APPROVED

5. HEAD can:
- Final approval
- Before HEAD_APPROVED:
    Call allocation validation

6. Allocation Rules:
- Venue capacity >= participant_count
- No overlapping events in same venue with status HEAD_APPROVED or RUNNING
- Resource total allocated at overlapping time <= total_quantity

Time overlap rule:
(start1 < end2) AND (start2 < end1)

7. If conflict:
Return:
{
  success: false,
  message: "Clear explanation"
}

Example:
"Projector conflict: 3 requested but only 1 available during 2PM-4PM"

8. Admin can:
- Add venues
- Add resources
- Update resource quantity

9. On event COMPLETED:
- Status = COMPLETED
- Resources automatically considered free

=========================================
ALLOCATION SERVICE REQUIREMENTS
=========================================

Create validateAllocation(eventId):

Steps:
1. Fetch event
2. Check venue capacity
3. Check venue overlapping events
4. For each resource:
   - Sum allocated quantities for overlapping approved events
   - Ensure <= total_quantity
5. Return detailed conflict if violation

=========================================
FRONTEND REQUIREMENTS
=========================================

Use Vite React app in /frontend.

Folder structure:

frontend/src/
  main.jsx
  App.jsx
  api.js
  pages/
    Login.jsx
    Register.jsx
    Dashboard.jsx
    CreateEvent.jsx
    AdminPanel.jsx
  components/
    EventCard.jsx
    ProtectedRoute.jsx

=========================================
FRONTEND FUNCTIONALITY
=========================================

1. Login page
2. Register page
3. Dashboard (role-based rendering)
4. Coordinator:
   - Create event form
   - View event list
   - Submit event
5. HOD:
   - Approve/Reject buttons
6. DEAN:
   - Approve
7. HEAD:
   - Final approve (trigger validation)
8. ADMIN:
   - Add venue form
   - Add resource form

Store JWT in localStorage.

Use Axios instance with Authorization header.

=========================================
UI REQUIREMENTS
=========================================

- Clean layout
- Header showing role
- Simple tables for events
- Status badges with colors
- Conflict messages displayed clearly
- Minimal but functional styling

=========================================
DEMO DATA SEEDING
=========================================

On first run:
- Seed:
  - 1 HOD
  - 1 DEAN
  - 1 HEAD
  - 1 ADMIN
  - 1 Coordinator
  - 2 Venues
  - 3 Resources

=========================================
QUICK START
=========================================

**3 Terminals Required:**

Terminal 1 - Backend:
```bash
cd backend
npm install
npm start
# Runs on http://localhost:5000
```

Terminal 2 - Frontend:
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

Terminal 3 - Tests:
```bash
npm install
npm test
# OR on Windows: test.bat
# OR on macOS/Linux: bash test.sh
```

=========================================
FEATURES DELIVERED
=========================================

✅ Complete Backend (Node.js + Express + SQLite)
✅ Complete Frontend (React + Vite + Axios)
✅ JWT Authentication with Role-Based Access
✅ Multi-Level Event Approval Workflow
✅ Allocation Validation (Venue, Resources, Time)
✅ Conflict Detection with Detailed Messages
✅ Full-Page Display (UI issue fixed)
✅ Comprehensive Test Suite (7 categories, 30+ tests)
✅ Demo Data Seeding
✅ Production-Ready Code

=========================================
COMPREHENSIVE TEST SUITE
=========================================

Tests all 35+ critical paths:

1. Authentication (8 tests)
   - Login all 5 roles
   - Invalid credentials
   - Unauthenticated access

2. Admin Operations (5 tests)
   - Get venues/resources
   - Add new venues/resources
   - Role-based access control

3. Event Workflow (8 tests)
   - Create → Submit → 3-Level Approvals → Run → Complete
   - Full lifecycle with validation

4. Conflict Detection (4 tests)
   - Resource conflicts
   - Venue capacity issues
   - Time overlaps
   - Detailed error messages

5. Rejection Workflow (2 tests)
   - HOD rejection with reason
   - Prevent resubmit

6. Role-Based Access (3 tests)
   - Coordinator cannot approve
   - HOD cannot create
   - Token validation

7. Edge Cases (5+ tests)
   - Invalid data handling
   - Boundary conditions
   - Database edge cases

Run: npm test

=========================================
FILES & DOCUMENTATION
=========================================

Core Files:
- backend/server.js - Express API server
- backend/db.js - SQLite database with seeding
- frontend/src/App.jsx - React router setup
- frontend/vite.config.js - Vite bundler config

Documentation:
- QUICK_START.md - Quick start guide
- SETUP.md - Detailed setup & API reference
- TEST_GUIDE.md - Test suite documentation
- test.js - Comprehensive test script (500+ lines)

=========================================
ISSUES FIXED
=========================================

**Issue 1: Half-Page Display** ✅
- Fixed App.css with proper width/height
- Fixed Dashboard.css layout
- Full page now displays correctly

**Issue 2: Missing Tests** ✅
- Created comprehensive test suite
- Tests all 5 user roles
- Tests all workflows and edge cases
- Tests all conflict scenarios
- Tests all error conditions

=========================================
DEMO CREDENTIALS
=========================================

Login Test User:        coordinator@institution.edu / coordinator123
HOD:                   hod@institution.edu / hod123
DEAN:                  dean@institution.edu / dean123
HEAD:                  head@institution.edu / head123
ADMIN:                 admin@institution.edu / admin123

=========================================
DATABASE STATUS
=========================================

✅ Automatically created on first run
✅ Seeded with demo data (5 users, 2 venues, 3 resources)
✅ Persistent SQLite database
✅ Location: backend/events.db
✅ Can be reset by deleting the file

Location: backend/events.db
