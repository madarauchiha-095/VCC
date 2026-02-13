import express from 'express';
import db from '../db.js';
import { verifyToken, checkRole } from '../middleware/auth.js';
import { validateAllocation } from '../services/allocationService.js';

const router = express.Router();

// Get events pending approval for HOD
router.get('/pending/hod', verifyToken, checkRole('HOD'), (req, res) => {
  db.all(
    `SELECT e.*, u.name as coordinator_name, v.name as venue_name FROM events e 
     LEFT JOIN users u ON e.coordinator_id = u.id 
     LEFT JOIN venues v ON e.venue_id = v.id 
     WHERE e.status = 'SUBMITTED'`,
    [],
    (err, events) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error fetching events' });
      }

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
    }
  );
});

// Get events pending approval for DEAN
router.get('/pending/dean', verifyToken, checkRole('DEAN'), (req, res) => {
  db.all(
    `SELECT e.*, u.name as coordinator_name, v.name as venue_name FROM events e 
     LEFT JOIN users u ON e.coordinator_id = u.id 
     LEFT JOIN venues v ON e.venue_id = v.id 
     WHERE e.status = 'HOD_APPROVED'`,
    [],
    (err, events) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error fetching events' });
      }

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
    }
  );
});

// Get events pending approval for HEAD
router.get('/pending/head', verifyToken, checkRole('HEAD'), (req, res) => {
  db.all(
    `SELECT e.*, u.name as coordinator_name, v.name as venue_name FROM events e 
     LEFT JOIN users u ON e.coordinator_id = u.id 
     LEFT JOIN venues v ON e.venue_id = v.id 
     WHERE e.status = 'DEAN_APPROVED'`,
    [],
    (err, events) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error fetching events' });
      }

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
    }
  );
});

// HOD Approve
router.put('/:id/hod-approve', verifyToken, checkRole('HOD'), (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT * FROM events WHERE id = ? AND status = 'SUBMITTED'`,
    [id],
    (err, event) => {
      if (err || !event) {
        return res.status(404).json({ success: false, message: 'Event not found or cannot be approved' });
      }

      db.run(
        `UPDATE events SET status = 'HOD_APPROVED' WHERE id = ?`,
        [id],
        (err) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Error approving event' });
          }

          res.json({ success: true, message: 'Event approved by HOD' });
        }
      );
    }
  );
});

// HOD Reject
router.put('/:id/hod-reject', verifyToken, checkRole('HOD'), (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ success: false, message: 'Rejection reason required' });
  }

  db.get(
    `SELECT * FROM events WHERE id = ? AND status = 'SUBMITTED'`,
    [id],
    (err, event) => {
      if (err || !event) {
        return res.status(404).json({ success: false, message: 'Event not found or cannot be rejected' });
      }

      db.run(
        `UPDATE events SET status = 'REJECTED', rejection_reason = ? WHERE id = ?`,
        [reason, id],
        (err) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Error rejecting event' });
          }

          res.json({ success: true, message: 'Event rejected by HOD' });
        }
      );
    }
  );
});

// DEAN Approve
router.put('/:id/dean-approve', verifyToken, checkRole('DEAN'), (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT * FROM events WHERE id = ? AND status = 'HOD_APPROVED'`,
    [id],
    (err, event) => {
      if (err || !event) {
        return res.status(404).json({ success: false, message: 'Event not found or cannot be approved' });
      }

      db.run(
        `UPDATE events SET status = 'DEAN_APPROVED' WHERE id = ?`,
        [id],
        (err) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Error approving event' });
          }

          res.json({ success: true, message: 'Event approved by DEAN' });
        }
      );
    }
  );
});

// HEAD Approve with validation
router.put('/:id/head-approve', verifyToken, checkRole('HEAD'), (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT * FROM events WHERE id = ? AND status = 'DEAN_APPROVED'`,
    [id],
    (err, event) => {
      if (err || !event) {
        return res.status(404).json({ success: false, message: 'Event not found or cannot be approved' });
      }

      // Validate allocation
      validateAllocation(id, (validationResult) => {
        if (!validationResult.success) {
          return res.status(400).json(validationResult);
        }

        db.run(
          `UPDATE events SET status = 'HEAD_APPROVED' WHERE id = ?`,
          [id],
          (err) => {
            if (err) {
              return res.status(500).json({ success: false, message: 'Error approving event' });
            }

            res.json({ success: true, message: 'Event approved by HEAD and all allocations validated' });
          }
        );
      });
    }
  );
});

export default router;
