# Comprehensive Test Suite

This directory contains a comprehensive test script for the Event Management System that tests all functionality, edge cases, and potential issues.

## Setup

Install dependencies:
```bash
npm install
```

## Running Tests

Make sure both backend and frontend are running:

**Terminal 1 - Backend:**
```bash
cd backend
npm install
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Terminal 3 - Tests:**
```bash
npm test
```

Or with auto-reload:
```bash
npm run test:watch
```

## What the Test Suite Covers

### 1. Authentication Tests
- ✓ Login with all demo user roles (COORDINATOR, HOD, DEAN, HEAD, ADMIN)
- ✓ Invalid password rejection
- ✓ Non-existent user rejection
- ✓ Get current user info

### 2. Admin Operations
- ✓ Get all venues
- ✓ Get all resources
- ✓ Add new venue (admin only)
- ✓ Add new resource (admin only)
- ✓ Verify non-admin cannot add venues/resources

### 3. Event Workflow (Full Lifecycle)
- ✓ Create event by COORDINATOR
- ✓ Get event details
- ✓ Submit event (COORDINATOR)
- ✓ HOD approval
- ✓ DEAN approval
- ✓ HEAD final approval with allocation validation
- ✓ Start event
- ✓ Complete event

### 4. Conflict Detection
- ✓ Resource allocation conflict (overlapping time, insufficient quantity)
- ✓ Venue capacity conflict (participants exceed capacity)
- ✓ Venue time overlap conflict (same venue, overlapping times)
- ✓ Detailed conflict messages

### 5. Rejection Workflow
- ✓ HOD rejection with reason
- ✓ Prevent resubmit of rejected event

### 6. Role-Based Access Control
- ✓ Coordinator cannot approve events
- ✓ HOD cannot create events
- ✓ Unauthenticated access denied

### 7. Edge Cases
- ✓ Events with past dates
- ✓ Invalid time ranges (end before start)
- ✓ Negative participant count
- ✓ Missing required fields
- ✓ Zero quantity resources

## Demo User Credentials

Used by the test suite:

| Role | Email | Password |
|------|-------|----------|
| COORDINATOR | coordinator@institution.edu | coordinator123 |
| HOD | hod@institution.edu | hod123 |
| DEAN | dean@institution.edu | dean123 |
| HEAD | head@institution.edu | head123 |
| ADMIN | admin@institution.edu | admin123 |

## Expected Output

The test script provides colored output:
- ✓ Green = Test passed
- ✗ Red = Test failed
- ℹ Blue = Information
- ⚠ Yellow = Warning
- → Cyan = Test description

Example successful run:
```
=== AUTHENTICATION TESTS ===
→ Testing: Login with all demo accounts
✓ COORDINATOR login successful
✓ HOD login successful
✓ DEAN login successful
✓ HEAD login successful
✓ ADMIN login successful
→ Testing: Login with invalid credentials
✓ Correctly rejected invalid credentials
...

=== TEST SUMMARY ===
✓ PASSED - Authentication
✓ PASSED - Admin Operations
✓ PASSED - Event Workflow
✓ PASSED - Conflict Detection
✓ PASSED - Rejection Workflow
✓ PASSED - Role-Based Access
✓ PASSED - Edge Cases

Total: 7/7 test suites passed
✓ All tests passed!
```

## Troubleshooting

### Backend not running
If you see: `Error: Backend server is not running on http://localhost:5000`
- Start the backend: `cd backend && npm start`

### Tests timeout
- Ensure backend has fully started before running tests
- Wait a few seconds after starting backend

### Database issues
- Delete `backend/events.db` to reset the database
- The demo data will be re-seeded on next backend start

## Test Results Interpretation

- **PASSED (Green)**: All tests in that category passed
- **FAILED (Red)**: One or more tests in that category failed
  - Check the console output for specific test failures
  - Each failed test is clearly marked with ✗

## Modifying Tests

To add more tests, edit `test.js` and add a new async function following the pattern:

```javascript
async function testNewFeature() {
  log.section('NEW FEATURE TEST');
  
  log.test('Test description');
  try {
    // Your test code here
    log.success('Test passed');
  } catch (err) {
    log.error(`Test failed: ${err.message}`);
    return false;
  }
  
  return true;
}
```

Then add it to the `tests` array in `runAllTests()`.
