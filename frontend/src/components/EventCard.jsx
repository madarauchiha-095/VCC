import React from 'react';
import './EventCard.css';

export default function EventCard({ event, onAction, userRole }) {
  const getStatusColor = (status) => {
    const colors = {
      DRAFT: '#FFC107',
      SUBMITTED: '#2196F3',
      HOD_APPROVED: '#00BCD4',
      DEAN_APPROVED: '#4CAF50',
      HEAD_APPROVED: '#8BC34A',
      REJECTED: '#F44336',
      RUNNING: '#00796B',
      COMPLETED: '#673AB7'
    };
    return colors[status] || '#999';
  };

  return (
    <div className="event-card">
      <div className="event-header">
        <h3>{event.title}</h3>
        <span className="status-badge" style={{ backgroundColor: getStatusColor(event.status) }}>
          {event.status}
        </span>
      </div>

      <div className="event-details">
        <p><strong>Department:</strong> {event.department}</p>
        <p><strong>Coordinator:</strong> {event.coordinator_name}</p>
        <p><strong>Venue:</strong> {event.venue_name}</p>
        <p><strong>Participants:</strong> {event.participant_count}</p>
        <p><strong>Time:</strong> {new Date(event.start_time).toLocaleString()} - {new Date(event.end_time).toLocaleString()}</p>

        {event.resources && event.resources.length > 0 && (
          <div className="resources">
            <strong>Resources:</strong>
            <ul>
              {event.resources.map((r) => (
                <li key={r.id}>{r.resource_name} - Qty: {r.quantity}</li>
              ))}
            </ul>
          </div>
        )}

        {event.rejection_reason && (
          <div className="rejection-reason">
            <strong>Rejection Reason:</strong> {event.rejection_reason}
          </div>
        )}
      </div>

      {onAction && <div className="event-actions">{onAction(event)}</div>}
    </div>
  );
}
