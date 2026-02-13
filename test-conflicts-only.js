const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const FRONTEND_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  validateStatus: () => true,
});

// ============ LOGGING UTILITIES ============
const log = {
  section: (title) => console.log(`\n${'='.repeat(60)}\n${title}\n${'='.repeat(60)}`),
  test: (title) => console.log(`\n→ ${title}`),
  success: (msg) => console.log(`✓ ${msg}`),
  error: (msg) => console.log(`✗ ${msg}`),
  info: (msg) => console.log(`ℹ ${msg}`),
  warn: (msg) => console.log(`⚠ ${msg}`),
};

// ============ TEST DATA & AUTHENTICATION ============
const testData = {
  users: [
    { id: 'coordinator@institution.edu', password: 'coordinator123', role: 'COORDINATOR', name: 'John Coordinator' },
    { id: 'hod@institution.edu', password: 'hod123', role: 'HOD', name: 'HOD User' },
    { id: 'dean@institution.edu', password: 'dean123', role: 'DEAN', name: 'Dean User' },
    { id: 'head@institution.edu', password: 'head123', role: 'HEAD', name: 'Head User' },
    { id: 'admin@institution.edu', password: 'admin123', role: 'ADMIN', name: 'Admin User' },
  ],
  tokens: {},
};

// ============ SETUP FUNCTION ============
async function setup() {
  log.section('SETUP: Authenticating users and fetching venues/resources');

  // Authenticate all users
  for (const user of testData.users) {
    try {
      const response = await api.post('/auth/login', {
        email: user.id,
        password: user.password,
      });

      if (response.data.token) {
        testData.tokens[user.role.toLowerCase()] = response.data.token;
        log.success(`Authenticated: ${user.role}`);
      } else {
        log.error(`Failed to authenticate ${user.role}`);
        return false;
      }
    } catch (err) {
      log.error(`Error authenticating ${user.role}: ${err.message}`);
      return false;
    }
  }

  // Fetch venues and resources
  try {
    const venuesResponse = await api.get('/admin/venues', {
      headers: { Authorization: `Bearer ${testData.tokens.admin}` },
    });
    testData.venues = venuesResponse.data.venues || [];
    log.success(`Fetched ${testData.venues.length} venues`);

    const resourcesResponse = await api.get('/admin/resources', {
      headers: { Authorization: `Bearer ${testData.tokens.admin}` },
    });
    testData.resources = resourcesResponse.data.resources || [];
    log.success(`Fetched ${testData.resources.length} resources`);

    if (testData.venues.length === 0 || testData.resources.length === 0) {
      log.error('Insufficient venues or resources for testing');
      return false;
    }

    return true;
  } catch (err) {
    log.error(`Failed to fetch setup data: ${err.message}`);
    return false;
  }
}

// ============ CONFLICT TEST FUNCTION ============
async function testConflict(conflictName, eventData, description) {
  log.test(`${conflictName}: ${description}`);
  
  try {
    // Create event
    const createResponse = await api.post('/events', eventData, {
      headers: { Authorization: `Bearer ${testData.tokens.coordinator}` },
    });

    if (!createResponse.data.success) {
      log.error(`Failed to create event: ${createResponse.data.message}`);
      return false;
    }

    const eventId = createResponse.data.eventId;

    // Submit event
    const submitResponse = await api.put(`/events/${eventId}/submit`, {}, {
      headers: { Authorization: `Bearer ${testData.tokens.coordinator}` },
    });

    if (!submitResponse.data.success) {
      log.warn(`Event submission failed: ${submitResponse.data.message}`);
      return false;
    }

    // HOD Approve
    const hodResponse = await api.put(`/approvals/${eventId}/hod-approve`, {}, {
      headers: { Authorization: `Bearer ${testData.tokens.hod}` },
    });

    if (!hodResponse.data.success) {
      log.warn(`HOD approval failed: ${hodResponse.data.message}`);
      return false;
    }

    // DEAN Approve
    const deanResponse = await api.put(`/approvals/${eventId}/dean-approve`, {}, {
      headers: { Authorization: `Bearer ${testData.tokens.dean}` },
    });

    if (!deanResponse.data.success) {
      log.warn(`DEAN approval failed: ${deanResponse.data.message}`);
      return false;
    }

    // HEAD Approve (This is where conflicts are caught)
    const headResponse = await api.put(`/approvals/${eventId}/head-approve`, {}, {
      headers: { Authorization: `Bearer ${testData.tokens.head}` },
    });

    if (!headResponse.data.success) {
      log.success(`✓ CONFLICT DETECTED and REJECTED:\n  ${headResponse.data.message}`);
      return true; // Conflict properly detected
    } else {
      log.error(`❌ CONFLICT NOT DETECTED - Event was approved!`);
      return false;
    }
  } catch (err) {
    log.error(`Unexpected error: ${err.message}`);
    return false;
  }
}

// ============ MAIN CONFLICT TEST SUITE ============
async function runConflictTests() {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const results = [];

  log.section('COMPREHENSIVE CONFLICT DETECTION TEST SUITE');

  // ========== CONFLICT GROUP 1: VENUE CAPACITY ==========
  log.section('GROUP 1: VENUE CAPACITY CONFLICTS');

  const venue1 = testData.venues[0];
  const venue2 = testData.venues.length > 1 ? testData.venues[1] : venue1;

  // Conflict 1.1: Significantly over capacity
  const result1_1 = await testConflict(
    'CONFLICT 1.1',
    {
      title: 'Mega Event - Way Over Capacity',
      department: 'Central',
      venue_id: venue1.id,
      start_time: new Date(now + 200 * day).toISOString(),
      end_time: new Date(now + 200 * day + 2 * 60 * 60 * 1000).toISOString(),
      participant_count: Math.max(99999, (venue1.capacity || 100) + 10000),
      resources: [],
    },
    'Participants far exceed venue capacity'
  );
  results.push({ name: 'Capacity Overflow', passed: result1_1 });

  // Conflict 1.2: Just 1 over capacity
  const result1_2 = await testConflict(
    'CONFLICT 1.2',
    {
      title: 'Just Over Capacity',
      department: 'Central',
      venue_id: venue1.id,
      start_time: new Date(now + 201 * day).toISOString(),
      end_time: new Date(now + 201 * day + 2 * 60 * 60 * 1000).toISOString(),
      participant_count: (venue1.capacity || 100) + 1,
      resources: [],
    },
    'Participants exceed capacity by exactly 1'
  );
  results.push({ name: 'Capacity Boundary (+1)', passed: result1_2 });

  // Conflict 1.3: At exact capacity (SHOULD PASS - no conflict)
  log.test('CONFLICT 1.3: At Exact Capacity (Boundary - should PASS)');
  try {
    const eventData = {
      title: 'Exactly At Capacity',
      department: 'Central',
      venue_id: venue1.id,
      start_time: new Date(now + 202 * day).toISOString(),
      end_time: new Date(now + 202 * day + 2 * 60 * 60 * 1000).toISOString(),
      participant_count: venue1.capacity || 100,
      resources: [],
    };

    const createResponse = await api.post('/events', eventData, {
      headers: { Authorization: `Bearer ${testData.tokens.coordinator}` },
    });
    const eventId = createResponse.data.eventId;

    await api.put(`/events/${eventId}/submit`, {}, {
      headers: { Authorization: `Bearer ${testData.tokens.coordinator}` },
    });
    await api.put(`/approvals/${eventId}/hod-approve`, {}, {
      headers: { Authorization: `Bearer ${testData.tokens.hod}` },
    });
    await api.put(`/approvals/${eventId}/dean-approve`, {}, {
      headers: { Authorization: `Bearer ${testData.tokens.dean}` },
    });

    const headResponse = await api.put(`/approvals/${eventId}/head-approve`, {}, {
      headers: { Authorization: `Bearer ${testData.tokens.head}` },
    });

    if (headResponse.data.success) {
      log.success('✓ Correctly APPROVED at exact capacity');
      results.push({ name: 'Capacity Boundary (Exact)', passed: true });
    } else {
      log.error('❌ Incorrectly rejected at exact capacity');
      results.push({ name: 'Capacity Boundary (Exact)', passed: false });
    }
  } catch (err) {
    log.error(`Error: ${err.message}`);
    results.push({ name: 'Capacity Boundary (Exact)', passed: false });
  }

  // ========== CONFLICT GROUP 2: RESOURCE AVAILABILITY ==========
  log.section('GROUP 2: RESOURCE ALLOCATION CONFLICTS');

  const resource1 = testData.resources[0];

  // Conflict 2.1: Single resource - far exceed quantity
  const result2_1 = await testConflict(
    'CONFLICT 2.1',
    {
      title: 'Resource Overkill',
      department: 'Engineering',
      venue_id: venue1.id,
      start_time: new Date(now + 210 * day).toISOString(),
      end_time: new Date(now + 210 * day + 2 * 60 * 60 * 1000).toISOString(),
      participant_count: 50,
      resources: [{ resource_id: resource1.id, quantity: (resource1.total_quantity || 10) + 1000 }],
    },
    'Single resource quantity exceeded by large amount'
  );
  results.push({ name: 'Resource Overflow (Qty)', passed: result2_1 });

  // Conflict 2.2: Single resource - just 1 over
  const result2_2 = await testConflict(
    'CONFLICT 2.2',
    {
      title: 'Resource Just Over',
      department: 'Engineering',
      venue_id: venue1.id,
      start_time: new Date(now + 211 * day).toISOString(),
      end_time: new Date(now + 211 * day + 2 * 60 * 60 * 1000).toISOString(),
      participant_count: 50,
      resources: [{ resource_id: resource1.id, quantity: (resource1.total_quantity || 10) + 1 }],
    },
    'Single resource exceeds by exactly 1 unit'
  );
  results.push({ name: 'Resource Boundary (+1)', passed: result2_2 });

  // Conflict 2.3: At exact resource quantity (SHOULD PASS)
  log.test('CONFLICT 2.3: At Exact Resource Quantity (Boundary - should PASS)');
  try {
    const eventData = {
      title: 'Exactly Resource Limit',
      department: 'Engineering',
      venue_id: venue1.id,
      start_time: new Date(now + 212 * day).toISOString(),
      end_time: new Date(now + 212 * day + 2 * 60 * 60 * 1000).toISOString(),
      participant_count: 50,
      resources: [{ resource_id: resource1.id, quantity: resource1.total_quantity || 10 }],
    };

    const createResponse = await api.post('/events', eventData, {
      headers: { Authorization: `Bearer ${testData.tokens.coordinator}` },
    });
    const eventId = createResponse.data.eventId;

    await api.put(`/events/${eventId}/submit`, {}, {
      headers: { Authorization: `Bearer ${testData.tokens.coordinator}` },
    });
    await api.put(`/approvals/${eventId}/hod-approve`, {}, {
      headers: { Authorization: `Bearer ${testData.tokens.hod}` },
    });
    await api.put(`/approvals/${eventId}/dean-approve`, {}, {
      headers: { Authorization: `Bearer ${testData.tokens.dean}` },
    });

    const headResponse = await api.put(`/approvals/${eventId}/head-approve`, {}, {
      headers: { Authorization: `Bearer ${testData.tokens.head}` },
    });

    if (headResponse.data.success) {
      log.success('✓ Correctly APPROVED at exact resource limit');
      results.push({ name: 'Resource Boundary (Exact)', passed: true });
    } else {
      log.error('❌ Incorrectly rejected at exact resource limit');
      results.push({ name: 'Resource Boundary (Exact)', passed: false });
    }
  } catch (err) {
    log.error(`Error: ${err.message}`);
    results.push({ name: 'Resource Boundary (Exact)', passed: false });
  }

  // Conflict 2.4: Multiple resources, one exceeds
  if (testData.resources.length > 1) {
    const result2_4 = await testConflict(
      'CONFLICT 2.4',
      {
        title: 'Multiple Resources - One Over',
        department: 'Engineering',
        venue_id: venue1.id,
        start_time: new Date(now + 213 * day).toISOString(),
        end_time: new Date(now + 213 * day + 2 * 60 * 60 * 1000).toISOString(),
        participant_count: 50,
        resources: [
          { resource_id: testData.resources[0].id, quantity: Math.floor((testData.resources[0].total_quantity || 10) / 2) },
          { resource_id: testData.resources[1].id, quantity: (testData.resources[1].total_quantity || 10) + 1 },
        ],
      },
      'Multiple resources allocated, one exceeds limit'
    );
    results.push({ name: 'Multiple Resources (One Over)', passed: result2_4 });
  }

  // ========== CONFLICT GROUP 3: VENUE TIME OVERLAP ==========
  log.section('GROUP 3: VENUE TIME OVERLAP CONFLICTS');

  const baseTime = now + 300 * day;

  // First, create and fully approve a reference event
  log.info('Creating reference event for overlap testing...');
  let referenceEventId = null;
  try {
    const refEvent = {
      title: 'Reference Event',
      department: 'Reference',
      venue_id: venue2.id,
      start_time: new Date(baseTime).toISOString(),
      end_time: new Date(baseTime + 3 * 60 * 60 * 1000).toISOString(),
      participant_count: 50,
      resources: [],
    };

    const createResponse = await api.post('/events', refEvent, {
      headers: { Authorization: `Bearer ${testData.tokens.coordinator}` },
    });
    referenceEventId = createResponse.data.eventId;

    await api.put(`/events/${referenceEventId}/submit`, {}, {
      headers: { Authorization: `Bearer ${testData.tokens.coordinator}` },
    });
    await api.put(`/approvals/${referenceEventId}/hod-approve`, {}, {
      headers: { Authorization: `Bearer ${testData.tokens.hod}` },
    });
    await api.put(`/approvals/${referenceEventId}/dean-approve`, {}, {
      headers: { Authorization: `Bearer ${testData.tokens.dean}` },
    });
    await api.put(`/approvals/${referenceEventId}/head-approve`, {}, {
      headers: { Authorization: `Bearer ${testData.tokens.head}` },
    });

    log.success('Reference event created and fully approved');
  } catch (err) {
    log.error(`Failed to create reference event: ${err.message}`);
  }

  if (referenceEventId) {
    // Conflict 3.1: Complete overlap
    const result3_1 = await testConflict(
      'CONFLICT 3.1',
      {
        title: 'Complete Time Overlap',
        department: 'Engineering',
        venue_id: venue2.id,
        start_time: new Date(baseTime).toISOString(),
        end_time: new Date(baseTime + 3 * 60 * 60 * 1000).toISOString(),
        participant_count: 50,
        resources: [],
      },
      'Event completely overlaps with existing event'
    );
    results.push({ name: 'Time Overlap (Complete)', passed: result3_1 });

    // Conflict 3.2: Partial overlap - starts before, ends during
    const result3_2 = await testConflict(
      'CONFLICT 3.2',
      {
        title: 'Partial Overlap - Before',
        department: 'Engineering',
        venue_id: venue2.id,
        start_time: new Date(baseTime - 30 * 60 * 1000).toISOString(),
        end_time: new Date(baseTime + 60 * 60 * 1000).toISOString(),
        participant_count: 50,
        resources: [],
      },
      'Event starts before and overlaps'
    );
    results.push({ name: 'Time Overlap (Before)', passed: result3_2 });

    // Conflict 3.3: Partial overlap - starts during, ends after
    const result3_3 = await testConflict(
      'CONFLICT 3.3',
      {
        title: 'Partial Overlap - After',
        department: 'Engineering',
        venue_id: venue2.id,
        start_time: new Date(baseTime + 2 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(baseTime + 4 * 60 * 60 * 1000).toISOString(),
        participant_count: 50,
        resources: [],
      },
      'Event starts during and extends after'
    );
    results.push({ name: 'Time Overlap (After)', passed: result3_3 });

    // Conflict 3.4: Overlap by 1 second
    const result3_4 = await testConflict(
      'CONFLICT 3.4',
      {
        title: 'Overlap 1 Second',
        department: 'Engineering',
        venue_id: venue2.id,
        start_time: new Date(baseTime + 3 * 60 * 60 * 1000 - 1000).toISOString(),
        end_time: new Date(baseTime + 4 * 60 * 60 * 1000).toISOString(),
        participant_count: 50,
        resources: [],
      },
      'Events overlap by exactly 1 second'
    );
    results.push({ name: 'Time Overlap (1 sec)', passed: result3_4 });

    // Conflict 3.5: Back-to-back (NO CONFLICT - should PASS)
    log.test('CONFLICT 3.5: Back-to-Back Events (Boundary - should PASS)');
    try {
      const eventData = {
        title: 'Back-to-Back After',
        department: 'Engineering',
        venue_id: venue2.id,
        start_time: new Date(baseTime + 3 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(baseTime + 5 * 60 * 60 * 1000).toISOString(),
        participant_count: 50,
        resources: [],
      };

      const createResponse = await api.post('/events', eventData, {
        headers: { Authorization: `Bearer ${testData.tokens.coordinator}` },
      });
      const eventId = createResponse.data.eventId;

      await api.put(`/events/${eventId}/submit`, {}, {
        headers: { Authorization: `Bearer ${testData.tokens.coordinator}` },
      });
      await api.put(`/approvals/${eventId}/hod-approve`, {}, {
        headers: { Authorization: `Bearer ${testData.tokens.hod}` },
      });
      await api.put(`/approvals/${eventId}/dean-approve`, {}, {
        headers: { Authorization: `Bearer ${testData.tokens.dean}` },
      });

      const headResponse = await api.put(`/approvals/${eventId}/head-approve`, {}, {
        headers: { Authorization: `Bearer ${testData.tokens.head}` },
      });

      if (headResponse.data.success) {
        log.success('✓ Correctly APPROVED for back-to-back events');
        results.push({ name: 'Time Overlap (Back-to-Back)', passed: true });
      } else {
        log.error('❌ Incorrectly rejected back-to-back event');
        results.push({ name: 'Time Overlap (Back-to-Back)', passed: false });
      }
    } catch (err) {
      log.error(`Error: ${err.message}`);
      results.push({ name: 'Time Overlap (Back-to-Back)', passed: false });
    }
  }

  // ========== CONFLICT GROUP 4: COMBINED/COMPLEX CONFLICTS ==========
  log.section('GROUP 4: COMBINED CONFLICTS');

  if (testData.resources.length > 0) {
    // Conflict 4.1: Over capacity AND over resource
    const result4_1 = await testConflict(
      'CONFLICT 4.1',
      {
        title: 'Double Conflict - Capacity + Resource',
        department: 'Central',
        venue_id: venue1.id,
        start_time: new Date(now + 400 * day).toISOString(),
        end_time: new Date(now + 400 * day + 2 * 60 * 60 * 1000).toISOString(),
        participant_count: (venue1.capacity || 100) * 2, // Over capacity
        resources: [{ resource_id: resource1.id, quantity: (resource1.total_quantity || 10) * 2 }], // Over resource
      },
      'Event exceeds both venue capacity AND resource availability'
    );
    results.push({ name: 'Combined (Capacity + Resource)', passed: result4_1 });
  }

  // ========== SUMMARY REPORT ==========
  log.section('CONFLICT DETECTION TEST SUMMARY');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log('\nDetailed Results:');
  results.forEach((result, index) => {
    const status = result.passed ? '✓' : '✗';
    console.log(`${status} ${index + 1}. ${result.name}`);
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`TOTAL: ${passed}/${total} conflict tests passed`);
  console.log(`SUCCESS: ${((passed / total) * 100).toFixed(1)}%`);
  console.log(`${'='.repeat(60)}\n`);

  if (passed === total) {
    log.success('All conflict detection tests PASSED!');
    return true;
  } else {
    log.error(`${total - passed} test(s) failed`);
    return false;
  }
}

// ============ MAIN EXECUTION ============
(async () => {
  try {
    const setupSuccess = await setup();
    if (!setupSuccess) {
      log.section('SETUP FAILED');
      process.exit(1);
    }

    const testSuccess = await runConflictTests();
    process.exit(testSuccess ? 0 : 1);
  } catch (err) {
    log.error(`Fatal error: ${err.message}`);
    process.exit(1);
  }
})();
