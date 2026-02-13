import express from 'express';
import db from '../db.js';
import { verifyToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Get all venues
router.get('/venues', verifyToken, (req, res) => {
  db.all(`SELECT * FROM venues`, [], (err, venues) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error fetching venues' });
    }

    res.json({ success: true, venues });
  });
});

// Get all resources
router.get('/resources', verifyToken, (req, res) => {
  db.all(`SELECT * FROM resources`, [], (err, resources) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error fetching resources' });
    }

    res.json({ success: true, resources });
  });
});

// Add venue (Admin only)
router.post('/venues', verifyToken, checkRole('ADMIN'), (req, res) => {
  const { name, capacity } = req.body;

  if (!name || !capacity) {
    return res.status(400).json({ success: false, message: 'Name and capacity required' });
  }

  db.run(
    `INSERT INTO venues (name, capacity) VALUES (?, ?)`,
    [name, capacity],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error adding venue' });
      }

      res.status(201).json({ success: true, message: 'Venue added successfully', venueId: this.lastID });
    }
  );
});

// Add resource (Admin only)
router.post('/resources', verifyToken, checkRole('ADMIN'), (req, res) => {
  const { name, total_quantity } = req.body;

  if (!name || total_quantity === undefined) {
    return res.status(400).json({ success: false, message: 'Name and total_quantity required' });
  }

  db.run(
    `INSERT INTO resources (name, total_quantity) VALUES (?, ?)`,
    [name, total_quantity],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error adding resource' });
      }

      res.status(201).json({ success: true, message: 'Resource added successfully', resourceId: this.lastID });
    }
  );
});

// Update resource quantity (Admin only)
router.put('/resources/:id', verifyToken, checkRole('ADMIN'), (req, res) => {
  const { id } = req.params;
  const { total_quantity } = req.body;

  if (total_quantity === undefined) {
    return res.status(400).json({ success: false, message: 'total_quantity required' });
  }

  db.run(
    `UPDATE resources SET total_quantity = ? WHERE id = ?`,
    [total_quantity, id],
    (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error updating resource' });
      }

      res.json({ success: true, message: 'Resource updated successfully' });
    }
  );
});

export default router;
