import db from '../db.js';

export function checkResourceConflicts(eventId, callback) {
  db.all(
    `SELECT er.*, r.name as resource_name, r.total_quantity
     FROM event_resources er
     JOIN resources r ON er.resource_id = r.id
     WHERE er.event_id = ?`,
    [eventId],
    (err, eventResources) => {
      if (err || !eventResources) {
        return callback([]);
      }

      db.get(
        `SELECT start_time, end_time FROM events WHERE id = ?`,
        [eventId],
        (err, event) => {
          if (err || !event) {
            return callback([]);
          }

          let conflicts = [];
          let checked = 0;

          eventResources.forEach((resource) => {
            // Find overlapping events using the same resource
            db.all(
              `SELECT e.title, e.start_time, e.end_time, er.quantity
               FROM events e
               JOIN event_resources er ON e.id = er.event_id
               WHERE er.resource_id = ?
               AND e.id != ?
               AND e.status IN ('HEAD_APPROVED', 'RUNNING')
               AND ((e.start_time < ? AND e.end_time > ?) OR (e.start_time < ? AND e.end_time > ?))`,
              [resource.resource_id, eventId, event.end_time, event.start_time, event.end_time, event.start_time],
              (err, overlappingEvents) => {
                if (!err && overlappingEvents && overlappingEvents.length > 0) {
                  const totalAllocated = overlappingEvents.reduce((sum, e) => sum + e.quantity, 0);

                  if (totalAllocated + resource.quantity > resource.total_quantity) {
                    conflicts.push({
                      resourceId: resource.resource_id,
                      resourceName: resource.resource_name,
                      requested: resource.quantity,
                      available: resource.total_quantity - totalAllocated,
                      conflictingEvents: overlappingEvents
                    });
                  }
                }

                checked++;
                if (checked === eventResources.length) {
                  callback(conflicts);
                }
              }
            );
          });

          if (eventResources.length === 0) {
            callback([]);
          }
        }
      );
    }
  );
}

export function checkVenueConflicts(eventId, callback) {
  db.get(
    `SELECT venue_id, start_time, end_time FROM events WHERE id = ?`,
    [eventId],
    (err, event) => {
      if (err || !event) {
        return callback([]);
      }

      db.all(
        `SELECT e.id, e.title, e.start_time, e.end_time, v.name as venue_name
         FROM events e
         JOIN venues v ON e.venue_id = v.id
         WHERE e.venue_id = ?
         AND e.id != ?
         AND e.status IN ('HEAD_APPROVED', 'RUNNING')
         AND ((e.start_time < ? AND e.end_time > ?) OR (e.start_time < ? AND e.end_time > ?))`,
        [event.venue_id, eventId, event.end_time, event.start_time, event.end_time, event.start_time],
        (err, conflicts) => {
          if (err) {
            return callback([]);
          }

          callback(conflicts || []);
        }
      );
    }
  );
}
