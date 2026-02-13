import db from '../db.js';

export function validateAllocation(eventId, callback) {
  // Step 1: Fetch event
  db.get(
    `SELECT * FROM events WHERE id = ?`,
    [eventId],
    (err, event) => {
      if (err || !event) {
        return callback({
          success: false,
          message: 'Event not found'
        });
      }

      // Step 2: Check venue capacity
      db.get(
        `SELECT * FROM venues WHERE id = ?`,
        [event.venue_id],
        (err, venue) => {
          if (err || !venue) {
            return callback({
              success: false,
              message: 'Venue not found'
            });
          }

          if (venue.capacity < event.participant_count) {
            return callback({
              success: false,
              message: `Venue capacity conflict: ${venue.name} has capacity ${venue.capacity} but ${event.participant_count} participants requested`
            });
          }

          // Step 3: Check venue overlapping events
          db.all(
            `SELECT * FROM events 
             WHERE venue_id = ? 
             AND id != ? 
             AND status IN ('HEAD_APPROVED', 'RUNNING')
             AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?))`,
            [event.venue_id, eventId, event.end_time, event.start_time, event.end_time, event.start_time],
            (err, overlappingEvents) => {
              if (err) {
                return callback({
                  success: false,
                  message: 'Error checking venue conflicts'
                });
              }

              if (overlappingEvents.length > 0) {
                return callback({
                  success: false,
                  message: `Venue conflict: ${venue.name} is already booked during this time by ${overlappingEvents.length} other event(s)`
                });
              }

              // Step 4: Check resources
              db.all(
                `SELECT * FROM event_resources WHERE event_id = ?`,
                [eventId],
                (err, eventResources) => {
                  if (err) {
                    return callback({
                      success: false,
                      message: 'Error checking event resources'
                    });
                  }

                  let resourcesChecked = 0;
                  let conflictDetails = [];

                  if (eventResources.length === 0) {
                    return callback({ success: true, message: 'Allocation validated' });
                  }

                  eventResources.forEach((eventResource) => {
                    // Get total quantity for this resource
                    db.get(
                      `SELECT id, total_quantity FROM resources WHERE id = ?`,
                      [eventResource.resource_id],
                      (err, resource) => {
                        if (err || !resource) {
                          resourcesChecked++;
                          if (resourcesChecked === eventResources.length) {
                            finishResourceCheck();
                          }
                          return;
                        }

                        // Sum allocated quantities for overlapping approved events
                        db.get(
                          `SELECT COALESCE(SUM(er.quantity), 0) as allocated_qty
                           FROM event_resources er
                           JOIN events e ON er.event_id = e.id
                           WHERE er.resource_id = ?
                           AND e.id != ?
                           AND e.status IN ('HEAD_APPROVED', 'RUNNING')
                           AND ((e.start_time < ? AND e.end_time > ?) OR (e.start_time < ? AND e.end_time > ?))`,
                          [eventResource.resource_id, eventId, event.end_time, event.start_time, event.end_time, event.start_time],
                          (err, result) => {
                            const allocatedQty = result?.allocated_qty || 0;
                            const availableQty = resource.total_quantity - allocatedQty;

                            if (eventResource.quantity > availableQty) {
                              const needed = eventResource.quantity;
                              const shortage = needed - availableQty;
                              
                              // Get resource name for detail message
                              db.get(
                                `SELECT name FROM resources WHERE id = ?`,
                                [resource.id],
                                (err, res) => {
                                  if (res) {
                                    conflictDetails.push({
                                      resourceName: res.name,
                                      requested: needed,
                                      available: availableQty,
                                      shortage: shortage
                                    });
                                  }
                                  
                                  resourcesChecked++;
                                  if (resourcesChecked === eventResources.length) {
                                    finishResourceCheck();
                                  }
                                }
                              );
                            } else {
                              resourcesChecked++;
                              if (resourcesChecked === eventResources.length) {
                                finishResourceCheck();
                              }
                            }
                          }
                        );
                      }
                    );
                  });

                  function finishResourceCheck() {
                    if (conflictDetails.length > 0) {
                      const detail = conflictDetails[0];
                      return callback({
                        success: false,
                        message: `Resource allocation conflict: ${detail.resourceName} - ${detail.requested} requested but only ${detail.available} available during this time`
                      });
                    } else {
                      return callback({ success: true, message: 'Allocation validated' });
                    }
                  }
                }
              );
            }
          );
        }
      );
    }
  );
}
