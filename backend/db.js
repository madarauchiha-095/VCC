import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'events.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

db.serialize(() => {
  db.configure('busyTimeout', 3000);
});

function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('COORDINATOR', 'HOD', 'DEAN', 'HEAD', 'ADMIN')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Venues table
    db.run(`
      CREATE TABLE IF NOT EXISTS venues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Resources table
    db.run(`
      CREATE TABLE IF NOT EXISTS resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        total_quantity INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Events table
    db.run(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        department TEXT NOT NULL,
        coordinator_id INTEGER NOT NULL,
        venue_id INTEGER NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        participant_count INTEGER NOT NULL,
        status TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'SUBMITTED', 'HOD_APPROVED', 'DEAN_APPROVED', 'HEAD_APPROVED', 'REJECTED', 'RUNNING', 'COMPLETED')),
        rejection_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (coordinator_id) REFERENCES users(id),
        FOREIGN KEY (venue_id) REFERENCES venues(id)
      )
    `);

    // Event_Resources table
    db.run(`
      CREATE TABLE IF NOT EXISTS event_resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        resource_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id),
        FOREIGN KEY (resource_id) REFERENCES resources(id)
      )
    `);

    // Seed demo data
    seedDemoData();
  });
}

function seedDemoData() {
  // Check if data already exists
  db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
    if (err) {
      console.error('Error checking users:', err);
      return;
    }

    if (row.count === 0) {
      console.log('Seeding demo data...');

      const hashPassword = async (password) => {
        return await bcrypt.hash(password, 10);
      };

      (async () => {
        // Create users
        const adminPassword = await hashPassword('admin123');
        const hod1Password = await hashPassword('hod123');
        const dean1Password = await hashPassword('dean123');
        const head1Password = await hashPassword('head123');
        const coord1Password = await hashPassword('coordinator123');

        db.run(
          `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
          ['Admin User', 'admin@institution.edu', adminPassword, 'ADMIN']
        );

        db.run(
          `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
          ['Dr. HOD', 'hod@institution.edu', hod1Password, 'HOD']
        );

        db.run(
          `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
          ['Prof. DEAN', 'dean@institution.edu', dean1Password, 'DEAN']
        );

        db.run(
          `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
          ['Dr. HEAD', 'head@institution.edu', head1Password, 'HEAD']
        );

        db.run(
          `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
          ['John Coordinator', 'coordinator@institution.edu', coord1Password, 'COORDINATOR']
        );

        // Create venues
        db.run(
          `INSERT INTO venues (name, capacity) VALUES (?, ?)`,
          ['Main Auditorium', 500]
        );

        db.run(
          `INSERT INTO venues (name, capacity) VALUES (?, ?)`,
          ['Conference Room A', 100]
        );

        // Create resources
        db.run(
          `INSERT INTO resources (name, total_quantity) VALUES (?, ?)`,
          ['Projector', 5]
        );

        db.run(
          `INSERT INTO resources (name, total_quantity) VALUES (?, ?)`,
          ['Microphone', 10]
        );

        db.run(
          `INSERT INTO resources (name, total_quantity) VALUES (?, ?)`,
          ['Chairs', 1000]
        );

        console.log('Demo data seeded successfully!');
      })();
    }
  });
}

export default db;
