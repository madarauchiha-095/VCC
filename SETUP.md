# Institutional Event Resource Management System

A complete full-stack solution for managing institutional events with role-based workflow and resource allocation.

## Quick Start

### Backend Setup

```bash
cd backend
npm install
npm start
```

Backend runs on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`

## System Architecture

### Backend Stack
- **Node.js + Express** - Server framework
- **SQLite** - Database
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **CORS** - Cross-origin resource sharing

### Frontend Stack
- **React 18** - UI framework
- **Vite** - Build tool
- **React Router** - Client-side routing
- **Axios** - HTTP client

## User Roles

1. **COORDINATOR** - Creates and manages events
2. **HOD** - First level of approval
3. **DEAN** - Second level of approval
4. **HEAD** - Final approval with validation
5. **ADMIN** - Manages venues and resources

## Event Workflow

```
DRAFT → SUBMITTED → HOD_APPROVED → DEAN_APPROVED → HEAD_APPROVED → RUNNING → COMPLETED
           ↓
        REJECTED (can reject at HOD level)
```

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Coordinator | coordinator@institution.edu | coordinator123 |
| HOD | hod@institution.edu | hod123 |
| DEAN | dean@institution.edu | dean123 |
| HEAD | head@institution.edu | head123 |
| Admin | admin@institution.edu | admin123 |

## Key Features

- ✅ Role-based access control
- ✅ Event creation and management
- ✅ Multi-level approval workflow
- ✅ Resource allocation management
- ✅ Venue capacity validation
- ✅ Conflict detection (venue, resources, time)
- ✅ JWT-based authentication
- ✅ Automatic data seeding
- ✅ Clean UI with status badges
- ✅ Real-time event status tracking

## Database Schema

### Users
- id, name, email (unique), password (hashed), role, created_at

### Venues
- id, name, capacity, created_at

### Resources
- id, name, total_quantity, created_at

### Events
- id, title, department, coordinator_id, venue_id, start_time, end_time, participant_count, status, rejection_reason, created_at

### Event_Resources
- id, event_id, resource_id, quantity, created_at

## Allocation Rules

Before HEAD approval, the system validates:

1. **Venue Capacity** - Participants ≤ Venue Capacity
2. **Venue Conflicts** - No overlapping HEAD_APPROVED or RUNNING events
3. **Resource Availability** - Requested quantity ≤ Available quantity

Time overlap rule: `(start1 < end2) AND (start2 < end1)`

## File Structure

```
VCC/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── package.json
│   ├── middleware/auth.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── eventRoutes.js
│   │   ├── approvalRoutes.js
│   │   └── adminRoutes.js
│   └── services/
│       ├── allocationService.js
│       └── conflictService.js
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── api.js
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Auth.css
    │   │   └── Dashboard.css
    │   └── components/
    │       ├── ProtectedRoute.jsx
    │       ├── EventCard.jsx
    │       └── EventCard.css
    └── public/
```

## Running the Project

### Terminal 1 - Backend
```bash
cd backend
npm install
npm start
```

### Terminal 2 - Frontend
```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:3000` in your browser.

## API Integration

Frontend communicates with backend via Axios with automatic JWT token injection. Base URL is `/api` (proxied to `http://localhost:5000/api` in development).

## Error Handling

- **400** - Bad Request (validation errors)
- **401** - Unauthorized (missing/invalid token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found (resource not found)
- **500** - Server Error

Conflict messages are descriptive, e.g.:
- "Projector conflict: 3 requested but only 1 available during 2PM-4PM"
- "Venue capacity conflict: Main Auditorium has capacity 500 but 600 participants requested"

## Development Notes

- JWT secret in middleware/auth.js should be changed in production
- SQLite database is file-based and persists in `backend/events.db`
- Frontend stores JWT token and user info in localStorage
- All timestamps use ISO format with UTC timezone
