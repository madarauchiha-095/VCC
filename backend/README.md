# Event Management System Backend

Node.js + Express + SQLite Backend for the Institutional Event Resource Management System.

## Installation

```bash
npm install
```

## Running the Server

```bash
npm start
```

or with automatic restart on file changes:

```bash
npm run dev
```

Server will run on `http://localhost:5000`

## Database

SQLite database is automatically created on first run at `backend/events.db`

Demo data is seeded automatically:
- 5 Users (1 Coordinator, 1 HOD, 1 DEAN, 1 HEAD, 1 Admin)
- 2 Venues
- 3 Resources

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Events
- `GET /api/events` - Get events (role-based)
- `POST /api/events` - Create event (Coordinator)
- `GET /api/events/:id` - Get event details
- `PUT /api/events/:id/submit` - Submit event (Coordinator)
- `PUT /api/events/:id/start` - Start event (Coordinator)
- `PUT /api/events/:id/complete` - Complete event (Coordinator)
- `PUT /api/events/:id/resources` - Update event resources (Coordinator)

### Approvals
- `GET /api/approvals/pending/hod` - Get pending HOD approvals
- `GET /api/approvals/pending/dean` - Get pending DEAN approvals
- `GET /api/approvals/pending/head` - Get pending HEAD approvals
- `PUT /api/approvals/:id/hod-approve` - HOD approve
- `PUT /api/approvals/:id/hod-reject` - HOD reject
- `PUT /api/approvals/:id/dean-approve` - DEAN approve
- `PUT /api/approvals/:id/head-approve` - HEAD approve (with validation)

### Admin
- `GET /api/admin/venues` - Get all venues
- `GET /api/admin/resources` - Get all resources
- `POST /api/admin/venues` - Add venue (Admin)
- `POST /api/admin/resources` - Add resource (Admin)
- `PUT /api/admin/resources/:id` - Update resource (Admin)

## Features

- JWT Authentication
- Role-based access control
- Event workflow: DRAFT → SUBMITTED → HOD_APPROVED → DEAN_APPROVED → HEAD_APPROVED → RUNNING → COMPLETED
- Automatic allocation validation before final approval
- Resource conflict detection
- Venue capacity validation
- Time overlap detection for events
