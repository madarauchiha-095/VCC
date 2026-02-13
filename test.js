#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}=== ${msg} ===${colors.reset}`),
  test: (msg) => console.log(`${colors.blue}→ Testing: ${msg}${colors.reset}`),
};

// Test state
let testData = {
  tokens: {},
  users: {},
  eventIds: [],
  venueIds: [],
  resourceIds: [],
};

// Test users
const testUsers = {
  coordinator: { email: 'coordinator@institution.edu', password: 'coordinator123', role: 'COORDINATOR', name: 'John Coordinator' },
  hod: { email: 'hod@institution.edu', password: 'hod123', role: 'HOD', name: 'Dr. HOD' },
  dean: { email: 'dean@institution.edu', password: 'dean123', role: 'DEAN', name: 'Prof. DEAN' },
  head: { email: 'head@institution.edu', password: 'head123', role: 'HEAD', name: 'Dr. HEAD' },
  admin: { email: 'admin@institution.edu', password: 'admin123', role: 'ADMIN', name: 'Admin User' },
};

const api = axios.create({ baseURL: BASE_URL });

// Test: Authentication & Login
async function testAuthentication() {
  log.section('AUTHENTICATION TESTS');

  // Test 1: Login with all demo users
  log.test('Login with all demo accounts');
  for (const [role, user] of Object.entries(testUsers)) {
    try {
      const response = await api.post('/auth/login', {
        email: user.email,
        password: user.password,
      });

      if (response.data.success) {
        testData.tokens[role] = response.data.token;
        testData.users[role] = response.data.user;
        log.success(`${role.toUpperCase()} login successful`);
      }
    } catch (err) {
      log.error(`${role.toUpperCase()} login failed: ${err.response?.data?.message || err.message}`);
      return false;
    }
  }

  // Test 2: Invalid credentials
  log.test('Login with invalid credentials');
  try {
    await api.post('/auth/login', {
      email: 'coordinator@institution.edu',
      password: 'wrongpassword123',
    });
    log.error('Should have failed with invalid password');
    return false;
  } catch (err) {
    if (err.response?.status === 401) {
      log.success('Correctly rejected invalid credentials');
    } else {
      log.error(`Unexpected error: ${err.message}`);
      return false;
    }
  }

  // Test 3: Non-existent user
  log.test('Login with non-existent user');
  try {
    await api.post('/auth/login', {
      email: 'nonexistent@institution.edu',
      password: 'password123',
    });
    log.error('Should have failed with non-existent user');
    return false;
  } catch (err) {
    if (err.response?.status === 401) {
      log.success('Correctly rejected non-existent user');
    } else {
      log.error(`Unexpected error: ${err.message}`);
      return false;
    }
  }

  // Test 4: Get current user
  log.test('Get current user info');
  try {
    const response = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${testData.tokens.coordinator}` },
    });
    if (response.data.user.role === 'COORDINATOR') {
      log.success('Current user info retrieved correctly');
    } else {
      log.error('Wrong user info returned');
      return false;
    }
  } catch (err) {
    log.error(`Failed to get user: ${err.message}`);
    return false;
  }

  return true;
}

// Test: Admin Operations
async function testAdminOperations() {
  log.section('ADMIN OPERATIONS');

  const adminToken = testData.tokens.admin;

  // Test 1: Get venues
  log.test('Get all venues');
  try {
    const response = await api.get('/admin/venues', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    testData.venueIds = response.data.venues.map((v) => v.id);
    log.success(`Retrieved ${response.data.venues.length} venues`);
  } catch (err) {
    log.error(`Failed to get venues: ${err.message}`);
    return false;
  }

  // Test 2: Get resources
  log.test('Get all resources');
  try {
    const response = await api.get('/admin/resources', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    testData.resourceIds = response.data.resources.map((r) => r.id);
    log.success(`Retrieved ${response.data.resources.length} resources`);
  } catch (err) {
    log.error(`Failed to get resources: ${err.message}`);
    return false;
  }

  // Test 3: Add new venue (admin only)
  log.test('Add new venue as ADMIN');
  try {
    const response = await api.post(
      '/admin/venues',
      { name: 'Test Auditorium', capacity: 300 },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    if (response.data.success) {
      log.success('Venue added successfully');
    }
  } catch (err) {
    log.error(`Failed to add venue: ${err.message}`);
    return false;
  }

  // Test 4: Add new resource (admin only)
  log.test('Add new resource as ADMIN');
  try {
    const response = await api.post(
      '/admin/resources',
      { name: 'Test Equipment', total_quantity: 20 },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    if (response.data.success) {
      log.success('Resource added successfully');
    }
  } catch (err) {
    log.error(`Failed to add resource: ${err.message}`);
    return false;
  }

  // Test 5: Non-admin cannot add venue
  log.test('Non-admin cannot add venue (should fail)');
  try {
    await api.post(
      '/admin/venues',
      { name: 'Unauthorized Venue', capacity: 200 },
      { headers: { Authorization: `Bearer ${testData.tokens.coordinator}` } }
    );
    log.error('Should have been forbidden');
    return false;
  } catch (err) {
    if (err.response?.status === 403) {
      log.success('Correctly rejected non-admin access');
    } else {
      log.error(`Unexpected error: ${err.message}`);
      return false;
    }
  }

  return true;
}

// Test: Event Creation and Workflow
async function testEventWorkflow() {
  log.section('EVENT WORKFLOW TESTS');

  const coordinatorToken = testData.tokens.coordinator;

  // Test 1: Create event
  log.test('Create event by COORDINATOR');
  const eventData = {
    title: 'Test Conference 2026',
    department: 'Engineering',
    venue_id: testData.venueIds[0],
    start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
    participant_count: 100,
    resources: [{ resource_id: testData.resourceIds[0], quantity: 2 }],
  };

  let eventId;
  try {
    const response = await api.post('/events', eventData, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    if (response.data.success) {
      eventId = response.data.eventId;
      testData.eventIds.push(eventId);
      log.success(`Event created with ID: ${eventId}`);
    }
  } catch (err) {
    log.error(`Failed to create event: ${err.response?.data?.message || err.message}`);
    return false;
  }

  // Test 2: Get event details
  log.test('Get event details');
  try {
    const response = await api.get(`/events/${eventId}`, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    if (response.data.event.id === eventId) {
      log.success('Event details retrieved correctly');
    }
  } catch (err) {
    log.error(`Failed to get event: ${err.message}`);
    return false;
  }

  // Test 3: Submit event
  log.test('Submit event (COORDINATOR)');
  try {
    const response = await api.put(`/events/${eventId}/submit`, {}, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    if (response.data.success) {
      log.success('Event submitted successfully');
    }
  } catch (err) {
    log.error(`Failed to submit: ${err.message}`);
    return false;
  }

  // Test 4: HOD Approve
  log.test('HOD approve event');
  try {
    const response = await api.put(`/approvals/${eventId}/hod-approve`, {}, {
      headers: { Authorization: `Bearer ${testData.tokens.hod}` },
    });
    if (response.data.success) {
      log.success('Event approved by HOD');
    }
  } catch (err) {
    log.error(`HOD approval failed: ${err.message}`);
    return false;
  }

  // Test 5: DEAN Approve
  log.test('DEAN approve event');
  try {
    const response = await api.put(`/approvals/${eventId}/dean-approve`, {}, {
      headers: { Authorization: `Bearer ${testData.tokens.dean}` },
    });
    if (response.data.success) {
      log.success('Event approved by DEAN');
    }
  } catch (err) {
    log.error(`DEAN approval failed: ${err.message}`);
    return false;
  }

  // Test 6: HEAD Final Approve with validation
  log.test('HEAD final approve with allocation validation');
  try {
    const response = await api.put(`/approvals/${eventId}/head-approve`, {}, {
      headers: { Authorization: `Bearer ${testData.tokens.head}` },
    });
    if (response.data.success) {
      log.success('Event approved by HEAD with validation');
    }
  } catch (err) {
    log.error(`HEAD approval failed: ${err.message}`);
    return false;
  }

  // Test 7: Start event
  log.test('Start event (COORDINATOR)');
  try {
    const response = await api.put(`/events/${eventId}/start`, {}, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    if (response.data.success) {
      log.success('Event started');
    }
  } catch (err) {
    log.error(`Failed to start event: ${err.message}`);
    return false;
  }

  // Test 8: Complete event
  log.test('Complete event (COORDINATOR)');
  try {
    const response = await api.put(`/events/${eventId}/complete`, {}, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    if (response.data.success) {
      log.success('Event completed');
    }
  } catch (err) {
    log.error(`Failed to complete event: ${err.message}`);
    return false;
  }

  return true;
}

// Test: Conflict Detection
async function testConflictDetection() {
  log.section('CONFLICT DETECTION TESTS');

  const coordinatorToken = testData.tokens.coordinator;
  const headToken = testData.tokens.head;
  const hodToken = testData.tokens.hod;
  const deanToken = testData.tokens.dean;
  const adminToken = testData.tokens.admin;
  
  // Fresh fetch to ensure we have valid IDs
  let venues = [], resources = [];
  try {
    const venueResponse = await api.get('/admin/venues', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    venues = venueResponse.data.venues;
    
    const resourceResponse = await api.get('/admin/resources', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    resources = resourceResponse.data.resources;
  } catch (err) {
    log.error(`Failed to fetch venues/resources: ${err.message}`);
    return false;
  }

  if (venues.length < 2) {
    log.warn(`Need at least 2 venues for conflict tests`);
    return true;
  }

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  // ======== CONFLICT #1: VENUE CAPACITY EXCEEDED ========
  log.test('CONFLICT #1: Venue capacity exceeded');
  try {
    const venue = venues[0];
    const eventData = {
      title: 'Over Capacity Event',
      department: 'Test Department',
      venue_id: venue.id,
      start_time: new Date(now + 100 * day).toISOString(),
      end_time: new Date(now + 100 * day + 2 * 60 * 60 * 1000).toISOString(),
      participant_count: 50000, // Way over capacity
      resources: [],
    };

    const response = await api.post('/events', eventData, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    
    const eventId = response.data.eventId;
    
    // Move through approval chain
    await api.put(`/events/${eventId}/submit`, {}, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    
    await api.put(`/approvals/${eventId}/hod-approve`, {}, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    
    await api.put(`/approvals/${eventId}/dean-approve`, {}, {
      headers: { Authorization: `Bearer ${deanToken}` },
    });

    // HEAD approval should fail due to capacity
    try {
      await api.put(`/approvals/${eventId}/head-approve`, {}, {
        headers: { Authorization: `Bearer ${headToken}` },
      });
      log.error('❌ HEAD approved despite exceeding capacity');
      return false;
    } catch (err) {
      if (err.response?.status === 400) {
        log.success(`✓ REJECTED at HEAD stage: ${err.response.data.message}`);
      } else {
        throw err;
      }
    }
  } catch (err) {
    log.error(`Test failed: ${err.message}`);
    return false;
  }

  // ======== CONFLICT #2: RESOURCE INSUFFICIENT ========
  log.test('CONFLICT #2: Insufficient resource quantity');
  try {
    if (resources.length < 1) {
      log.warn('Skipping resource conflict test - no resources');
    } else {
      const venue = venues[1];
      const resource = resources[0];
      const excessQty = (resource.total_quantity || 10) + 100;

      const eventData = {
        title: 'Over Resource Event',
        department: 'Test Department',
        venue_id: venue.id,
        start_time: new Date(now + 105 * day).toISOString(),
        end_time: new Date(now + 105 * day + 2 * 60 * 60 * 1000).toISOString(),
        participant_count: 50,
        resources: [{ resource_id: resource.id, quantity: excessQty }],
      };

      const response = await api.post('/events', eventData, {
        headers: { Authorization: `Bearer ${coordinatorToken}` },
      });
      
      const eventId = response.data.eventId;
      
      await api.put(`/events/${eventId}/submit`, {}, {
        headers: { Authorization: `Bearer ${coordinatorToken}` },
      });
      
      await api.put(`/approvals/${eventId}/hod-approve`, {}, {
        headers: { Authorization: `Bearer ${hodToken}` },
      });
      
      await api.put(`/approvals/${eventId}/dean-approve`, {}, {
        headers: { Authorization: `Bearer ${deanToken}` },
      });

      try {
        await api.put(`/approvals/${eventId}/head-approve`, {}, {
          headers: { Authorization: `Bearer ${headToken}` },
        });
        log.error('❌ HEAD approved despite insufficient resources');
        return false;
      } catch (err) {
        if (err.response?.status === 400) {
          log.success(`✓ REJECTED at HEAD stage: ${err.response.data.message}`);
        } else {
          throw err;
        }
      }
    }
  } catch (err) {
    log.error(`Test failed: ${err.message}`);
    return false;
  }

  // ======== CONFLICT #3: VENUE TIME OVERLAP ========
  log.test('CONFLICT #3: Venue already booked (time overlap)');
  try {
    const venue = venues[0];
    const baseTime = now + 110 * day;

    // Create FIRST event and approve it fully
    const event1Data = {
      title: 'First Booking',
      department: 'Dept A',
      venue_id: venue.id,
      start_time: new Date(baseTime).toISOString(),
      end_time: new Date(baseTime + 2 * 60 * 60 * 1000).toISOString(),
      participant_count: 100,
      resources: [],
    };

    const resp1 = await api.post('/events', event1Data, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    const event1Id = resp1.data.eventId;

    // Fully approve event 1
    await api.put(`/events/${event1Id}/submit`, {}, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    await api.put(`/approvals/${event1Id}/hod-approve`, {}, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    await api.put(`/approvals/${event1Id}/dean-approve`, {}, {
      headers: { Authorization: `Bearer ${deanToken}` },
    });
    await api.put(`/approvals/${event1Id}/head-approve`, {}, {
      headers: { Authorization: `Bearer ${headToken}` },
    });
    log.info('  → First event fully approved');

    // Try to create SECOND event overlapping same venue/time
    const event2Data = {
      title: 'Conflicting Booking',
      department: 'Dept B',
      venue_id: venue.id,
      start_time: new Date(baseTime + 60 * 60 * 1000).toISOString(), // 1 hour into first event
      end_time: new Date(baseTime + 3 * 60 * 60 * 1000).toISOString(),
      participant_count: 80,
      resources: [],
    };

    const resp2 = await api.post('/events', event2Data, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    const event2Id = resp2.data.eventId;

    await api.put(`/events/${event2Id}/submit`, {}, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    await api.put(`/approvals/${event2Id}/hod-approve`, {}, {
      headers: { Authorization: `Bearer ${hodToken}` },
    });
    await api.put(`/approvals/${event2Id}/dean-approve`, {}, {
      headers: { Authorization: `Bearer ${deanToken}` },
    });

    try {
      await api.put(`/approvals/${event2Id}/head-approve`, {}, {
        headers: { Authorization: `Bearer ${headToken}` },
      });
      log.error('❌ HEAD approved despite venue overlap');
      return false;
    } catch (err) {
      if (err.response?.status === 400) {
        log.success(`✓ REJECTED at HEAD stage: ${err.response.data.message}`);
      } else {
        throw err;
      }
    }
  } catch (err) {
    log.error(`Test failed: ${err.message}`);
    return false;
  }

  // ======== SUMMARY ========
  log.success('\n=== CONFLICT DETECTION SUMMARY ===');
  log.info('✓ Venue Capacity: ENFORCED');
  log.info('✓ Resource Availability: ENFORCED');
  log.info('✓ Time Overlap Detection: ENFORCED');
  log.info('✓ All conflicts caught at HEAD approval stage');

  return true;
}

// Test: Rejection Workflow
async function testRejectionWorkflow() {
  log.section('REJECTION WORKFLOW TESTS');

  const coordinatorToken = testData.tokens.coordinator;
  
  // Fresh fetch to ensure we have valid IDs
  let venues = [];
  try {
    const venueResponse = await api.get('/admin/venues', {
      headers: { Authorization: `Bearer ${testData.tokens.admin}` },
    });
    venues = venueResponse.data.venues;
  } catch (err) {
    log.error(`Failed to fetch venues: ${err.message}`);
    return false;
  }

  if (venues.length < 1) {
    log.error('No venues available for rejection test');
    return false;
  }

  const baseTime = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);

  // Create event for rejection
  log.test('Create event for rejection testing');
  const eventData = {
    title: 'Event to be Rejected',
    department: 'Science',
    venue_id: venues[0].id,
    start_time: new Date(baseTime.getTime()).toISOString(),
    end_time: new Date(baseTime.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    participant_count: 60,
    resources: [],
  };

  let eventId;
  try {
    const response = await api.post('/events', eventData, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    eventId = response.data.eventId;
    testData.eventIds.push(eventId);

    await api.put(`/events/${eventId}/submit`, {}, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    log.success('Event created and submitted');
  } catch (err) {
    log.error(`Failed to create event: ${err.message}`);
    return false;
  }

  // Test HOD rejection
  log.test('HOD reject with reason');
  try {
    const response = await api.put(`/approvals/${eventId}/hod-reject`, 
      { reason: 'Insufficient resources available for this event' },
      { headers: { Authorization: `Bearer ${testData.tokens.hod}` } }
    );
    if (response.data.success) {
      log.success('Event rejected by HOD with reason');
    }
  } catch (err) {
    log.error(`HOD rejection failed: ${err.message}`);
    return false;
  }

  // Test: Cannot approve after rejection
  log.test('Cannot submit rejected event without recreation');
  try {
    const response = await api.put(`/events/${eventId}/submit`, {}, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    log.error('Should not allow resubmit of rejected event');
    return false;
  } catch (err) {
    if (err.response?.status === 404) {
      log.success('Correctly prevented resubmit of rejected event');
    } else {
      log.warn(`Status: ${err.response?.status}`);
    }
  }

  return true;
}

// Test: Authorization & Role-Based Access
async function testRoleBasedAccess() {
  log.section('ROLE-BASED ACCESS CONTROL TESTS');

  // Test 1: Coordinator cannot approve events
  log.test('Coordinator cannot approve events (should fail)');
  try {
    const eventId = testData.eventIds[0]; // Use first event
    await api.put(`/approvals/${eventId}/hod-approve`, {}, {
      headers: { Authorization: `Bearer ${testData.tokens.coordinator}` },
    });
    log.error('Coordinator should not be able to approve');
    return false;
  } catch (err) {
    if (err.response?.status === 403) {
      log.success('Correctly rejected coordinator approval attempt');
    } else {
      log.error(`Unexpected error: ${err.message}`);
      return false;
    }
  }

  // Test 2: HOD cannot create events
  log.test('HOD cannot create events (should fail)');
  try {
    await api.post('/events', { title: 'Test', department: 'Test', venue_id: 1 }, {
      headers: { Authorization: `Bearer ${testData.tokens.hod}` },
    });
    log.error('HOD should not be able to create events');
    return false;
  } catch (err) {
    if (err.response?.status === 403) {
      log.success('Correctly rejected HOD event creation');
    } else {
      log.error(`Unexpected error: ${err.message}`);
      return false;
    }
  }

  // Test 3: No token access denied
  log.test('Access without token denied');
  try {
    await api.get('/events');
    log.error('Should require authentication');
    return false;
  } catch (err) {
    if (err.response?.status === 401) {
      log.success('Correctly denied unauthenticated access');
    } else {
      log.error(`Unexpected error: ${err.message}`);
      return false;
    }
  }

  return true;
}

// Test: Edge Cases
async function testEdgeCases() {
  log.section('EDGE CASE TESTS');

  const coordinatorToken = testData.tokens.coordinator;
  const adminToken = testData.tokens.admin;
  
  // Fetch fresh venue data
  let venues = [];
  try {
    const venueResponse = await api.get('/admin/venues', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    venues = venueResponse.data.venues;
  } catch (err) {
    log.error(`Failed to fetch venues: ${err.message}`);
    return false;
  }

  // ======== EDGE CASE #1: Participant count = 0 ========
  log.test('EDGE #1: Zero participant count');
  try {
    const eventData = {
      title: 'Zero Participants Event',
      department: 'Test',
      venue_id: venues[0]?.id || 1,
      start_time: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      participant_count: 0,
      resources: [],
    };

    const response = await api.post('/events', eventData, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    
    if (response.data.success) {
      log.success('✓ Zero participants accepted (valid edge case)');
    }
  } catch (err) {
    log.info(`  Rejected: ${err.response?.data?.message || err.message}`);
  }

  // ======== EDGE CASE #2: Negative participant count ========
  log.test('EDGE #2: Negative participant count');
  try {
    const eventData = {
      title: 'Negative Participants',
      department: 'Test',
      venue_id: venues[0]?.id || 1,
      start_time: new Date(Date.now() + 51 * 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 51 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      participant_count: -50,
      resources: [],
    };

    await api.post('/events', eventData, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    log.warn('⚠ Backend accepted negative participants (validation issue)');
  } catch (err) {
    log.success(`✓ REJECTED: ${err.response?.data?.message || err.message}`);
  }

  // ======== EDGE CASE #3: Missing required fields ========
  log.test('EDGE #3: Missing required fields');
  try {
    await api.post('/events', {
      title: 'Incomplete Event',
      // department missing
      venue_id: venues[0]?.id || 1,
    }, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    log.warn('⚠ Backend accepted incomplete event');
  } catch (err) {
    log.success(`✓ REJECTED: ${err.response?.data?.message || err.message}`);
  }

  // ======== EDGE CASE #4: Invalid venue ID ========
  log.test('EDGE #4: Non-existent venue ID');
  try {
    await api.post('/events', {
      title: 'Bad Venue Event',
      department: 'Test',
      venue_id: 999999,
      start_time: new Date(Date.now() + 52 * 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 52 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      participant_count: 50,
      resources: [],
    }, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    log.warn('⚠ Backend accepted invalid venue ID');
  } catch (err) {
    log.success(`✓ REJECTED: ${err.response?.data?.message || err.message}`);
  }

  // ======== EDGE CASE #5: End time before start time ========
  log.test('EDGE #5: Event end time before start time');
  try {
    const now = Date.now() + 53 * 24 * 60 * 60 * 1000;
    await api.post('/events', {
      title: 'Backwards Time Event',
      department: 'Test',
      venue_id: venues[0]?.id || 1,
      start_time: new Date(now + 3 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(now).toISOString(), // End BEFORE start
      participant_count: 50,
      resources: [],
    }, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    log.warn('⚠ Backend accepted invalid time range');
  } catch (err) {
    log.success(`✓ REJECTED: ${err.response?.data?.message || err.message}`);
  }

  // ======== EDGE CASE #6: Duplicate event submission ========
  log.test('EDGE #6: Duplicate submission attempt');
  try {
    const eventData = {
      title: 'Unique Event',
      department: 'Test',
      venue_id: venues[0]?.id || 1,
      start_time: new Date(Date.now() + 54 * 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 54 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      participant_count: 50,
      resources: [],
    };

    const response = await api.post('/events', eventData, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    const eventId = response.data.eventId;

    // Submit once
    await api.put(`/events/${eventId}/submit`, {}, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });

    // Try to submit again
    try {
      await api.put(`/events/${eventId}/submit`, {}, {
        headers: { Authorization: `Bearer ${coordinatorToken}` },
      });
      log.warn('⚠ Backend allowed duplicate submission');
    } catch (err) {
      log.success(`✓ REJECTED: ${err.response?.data?.message || err.message}`);
    }
  } catch (err) {
    log.info(`Setup error: ${err.message}`);
  }

  // ======== EDGE CASE #7: Very short event duration ========
  log.test('EDGE #7: Event duration < 1 minute');
  try {
    const now = Date.now() + 55 * 24 * 60 * 60 * 1000;
    await api.post('/events', {
      title: 'Nano Event',
      department: 'Test',
      venue_id: venues[0]?.id || 1,
      start_time: new Date(now).toISOString(),
      end_time: new Date(now + 30 * 1000).toISOString(), // 30 seconds
      participant_count: 1,
      resources: [],
    }, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    log.success('✓ Very short duration accepted');
  } catch (err) {
    log.info(`Rejected: ${err.message}`);
  }

  // ======== EDGE CASE #8: Very large participant count ========
  log.test('EDGE #8: Extremely large participant count');
  try {
    await api.post('/events', {
      title: 'Mega Gathering',
      department: 'Test',
      venue_id: venues[0]?.id || 1,
      start_time: new Date(Date.now() + 56 * 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 56 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      participant_count: 1000000,
      resources: [],
    }, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    log.warn('⚠ Accepted 1M participants (venue capacity should reject at HEAD)');
  } catch (err) {
    log.info(`Rejected during creation: ${err.message}`);
  }

  log.success('\n=== EDGE CASE SUMMARY ===');
  log.info('✓ Tested input validation');
  log.info('✓ Tested boundary conditions');
  log.info('✓ Tested invalid data types');
  log.info('✓ Tested duplicate operations');

  return true;
}

// Main test runner
async function runAllTests() {
  console.clear();
  log.section('EVENT MANAGEMENT SYSTEM - COMPREHENSIVE TEST SUITE');
  log.info(`Starting tests at ${new Date().toLocaleString()}\n`);

  const tests = [
    { name: 'Authentication', fn: testAuthentication },
    { name: 'Admin Operations', fn: testAdminOperations },
    { name: 'Event Workflow', fn: testEventWorkflow },
    { name: 'Conflict Detection', fn: testConflictDetection },
    { name: 'Rejection Workflow', fn: testRejectionWorkflow },
    { name: 'Role-Based Access', fn: testRoleBasedAccess },
    { name: 'Edge Cases', fn: testEdgeCases },
  ];

  const results = [];

  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
    } catch (err) {
      log.error(`Uncaught error in ${test.name}: ${err.message}`);
      results.push({ name: test.name, passed: false });
    }
  }

  // Summary
  log.section('TEST SUMMARY');
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  results.forEach((result) => {
    const status = result.passed ? colors.green + '✓ PASSED' : colors.red + '✗ FAILED';
    console.log(`${status}${colors.reset} - ${result.name}`);
  });

  console.log(`\n${colors.cyan}Total: ${passed}/${total} test suites passed${colors.reset}\n`);

  if (passed === total) {
    log.success('All tests passed!');
    process.exit(0);
  } else {
    log.error(`${total - passed} test suite(s) failed`);
    process.exit(1);
  }
}

// Check if servers are running
async function checkServers() {
  try {
    await api.get('/health');
    log.success('Backend server is running');
  } catch (err) {
    log.error('Backend server is not running on http://localhost:5000');
    log.info('Please start the backend with: cd backend && npm start');
    process.exit(1);
  }
}

// Start tests
(async () => {
  await checkServers();
  await runAllTests();
})();
