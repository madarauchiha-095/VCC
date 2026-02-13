import express from 'express';
import db from '../db.js';
import { verifyToken, checkRole } from '../middleware/auth.js';
import { validateAllocation } from '../services/allocationService.js';

const router = express.Router();

// Get all events (role-based)
router.get('/', verifyToken, (req, res) => {
  const { role, id } = req.user;

  let query = 'SELECT e.*, u.name as coordinator_name, v.name as venue_name FROM events e LEFT JOIN users u ON e.coordinator_id = u.id LEFT JOIN venues v ON e.venue_id = v.id';
  let params = [];

  if (role === 'COORDINATOR') {
    query += ' WHERE e.coordinator_id = ?';
    params = [id];
  } else if (role === 'HOD') {
    query += ' WHERE e.department = (SELECT role FROM users WHERE id = ?) OR e.status IN ("SUBMITTED", "HOD_APPROVED", "DEAN_APPROVED", "HEAD_APPROVED")';
    params = [id];
    // For HOD, show events from their department
    query = 'SELECT e.*, u.name as coordinator_name, v.name as venue_name FROM events e LEFT JOIN users u ON e.coordinator_id = u.id LEFT JOIN venues v ON e.venue_id = v.id WHERE e.status IN ("SUBMITTED", "HOD_APPROVED", "DEAN_APPROVED", "HEAD_APPROVED", "RUNNING", "COMPLETED")';
    params = [];
  }

  db.all(query, params, (err, events) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error fetching events' });
    }

    // Fetch resources for each event
    const eventsWithResources = events.map((event) => {
      return new Promise((resolve) => {
        db.all(
          `SELECT er.*, r.name as resource_name FROM event_resources er LEFT JOIN resources r ON er.resource_id = r.id WHERE er.event_id = ?`,
          [event.id],
          (err, resources) => {
            event.resources = resources || [];
            resolve(event);
          }
        );
      });
    });

    Promise.all(eventsWithResources).then((events) => {
      res.json({ success: true, events });
    });
  });
});

// Create event (Coordinator only)
router.post('/', verifyToken, checkRole('COORDINATOR'), (req, res) => {
  const { title, department, venue_id, start_time, end_time, participant_count, resources } = req.body;

  if (!title || !department || !venue_id || !start_time || !end_time || !participant_count) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  db.run(
    `INSERT INTO events (title, department, coordinator_id, venue_id, start_time, end_time, participant_count, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT')`,
    [title, department, req.user.id, venue_id, start_time, end_time, participant_count],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error creating event' });
      }

      const eventId = this.lastID;

      // Add resources if provided
      if (resources && resources.length > 0) {
        let resourcesAdded = 0;

        resources.forEach((resource) => {
          db.run(
            `INSERT INTO event_resources (event_id, resource_id, quantity) VALUES (?, ?, ?)`,
            [eventId, resource.resource_id, resource.quantity],
            (err) => {
              if (!err) resourcesAdded++;

              if (resourcesAdded === resources.length) {
                res.status(201).json({ success: true, message: 'Event created successfully', eventId });
              }
            }
          );
        });
      } else {
        res.status(201).json({ success: true, message: 'Event created successfully', eventId });
      }
    }
  );
});

// Get event details
router.get('/:id', verifyToken, (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT e.*, u.name as coordinator_name, v.name as venue_name FROM events e LEFT JOIN users u ON e.coordinator_id = u.id LEFT JOIN venues v ON e.venue_id = v.id WHERE e.id = ?`,
    [id],
    (err, event) => {
      if (err || !event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      db.all(
        `SELECT er.*, r.name as resource_name, r.total_quantity FROM event_resources er LEFT JOIN resources r ON er.resource_id = r.id WHERE er.event_id = ?`,
        [id],
        (err, resources) => {
          event.resources = resources || [];
          res.json({ success: true, event });
        }
      );
    }
  );
});

// Submit event (Coordinator only)
router.put('/:id/submit', verifyToken, checkRole('COORDINATOR'), (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT * FROM events WHERE id = ? AND coordinator_id = ? AND status = 'DRAFT'`,
    [id, req.user.id],
    (err, event) => {
      if (err || !event) {
        return res.status(404).json({ success: false, message: 'Event not found or cannot be submitted' });
      }

      db.run(
        `UPDATE events SET status = 'SUBMITTED' WHERE id = ?`,
        [id],
        (err) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Error updating event' });
          }

          res.json({ success: true, message: 'Event submitted successfully' });
        }
      );
    }
  );
});

// Mark event RUNNING (Coordinator only)
router.put('/:id/start', verifyToken, checkRole('COORDINATOR'), (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT * FROM events WHERE id = ? AND coordinator_id = ? AND status = 'HEAD_APPROVED'`,
    [id, req.user.id],
    (err, event) => {
      if (err || !event) {
        return res.status(404).json({ success: false, message: 'Event not found or cannot be started' });
      }

      db.run(
        `UPDATE events SET status = 'RUNNING' WHERE id = ?`,
        [id],
        (err) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Error updating event' });
          }

          res.json({ success: true, message: 'Event started successfully' });
        }
      );
    }
  );
});

// Mark event COMPLETED (Coordinator only)
router.put('/:id/complete', verifyToken, checkRole('COORDINATOR'), (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT * FROM events WHERE id = ? AND coordinator_id = ? AND status IN ('RUNNING', 'HEAD_APPROVED')`,
    [id, req.user.id],
    (err, event) => {
      if (err || !event) {
        return res.status(404).json({ success: false, message: 'Event not found or cannot be completed' });
      }

      db.run(
        `UPDATE events SET status = 'COMPLETED' WHERE id = ?`,
        [id],
        (err) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Error updating event' });
          }

          res.json({ success: true, message: 'Event completed successfully' });
        }
      );
    }
  );
});

// Update event resources (Coordinator only, DRAFT status)
router.put('/:id/resources', verifyToken, checkRole('COORDINATOR'), (req, res) => {
  const { id } = req.params;
  const { resources } = req.body;

  if (!resources || !Array.isArray(resources)) {
    return res.status(400).json({ success: false, message: 'Invalid resources' });
  }

  db.get(
    `SELECT * FROM events WHERE id = ? AND coordinator_id = ? AND status = 'DRAFT'`,
    [id, req.user.id],
    (err, event) => {
      if (err || !event) {
        return res.status(404).json({ success: false, message: 'Event not found or cannot be modified' });
      }

      // Delete existing resources
      db.run(`DELETE FROM event_resources WHERE event_id = ?`, [id], (err) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Error updating resources' });
        }

        let resourcesAdded = 0;

        if (resources.length === 0) {
          return res.json({ success: true, message: 'Resources updated successfully' });
        }

        resources.forEach((resource) => {
          db.run(
            `INSERT INTO event_resources (event_id, resource_id, quantity) VALUES (?, ?, ?)`,
            [id, resource.resource_id, resource.quantity],
            (err) => {
              if (!err) resourcesAdded++;

              if (resourcesAdded === resources.length) {
                res.json({ success: true, message: 'Resources updated successfully' });
              }
            }
          );
        });
      });
    }
  );
});

export default router;
