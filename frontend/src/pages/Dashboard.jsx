import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import EventCard from '../components/EventCard.jsx';
import './Dashboard.css';

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('my-events');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingEventId, setRejectingEventId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/events');
      if (response.data.success) {
        setEvents(response.data.events);
      }

      // Fetch pending events based on role
      const userData = JSON.parse(localStorage.getItem('user'));
      let pendingUrl = '';

      if (userData.role === 'HOD') {
        pendingUrl = '/approvals/pending/hod';
      } else if (userData.role === 'DEAN') {
        pendingUrl = '/approvals/pending/dean';
      } else if (userData.role === 'HEAD') {
        pendingUrl = '/approvals/pending/head';
      }

      if (pendingUrl) {
        const pendingResponse = await api.get(pendingUrl);
        if (pendingResponse.data.success) {
          setPendingEvents(pendingResponse.data.events);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEvent = async (eventId) => {
    try {
      const response = await api.put(`/events/${eventId}/submit`);
      if (response.data.success) {
        alert('Event submitted successfully');
        fetchEvents();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit event');
    }
  };

  const handleStartEvent = async (eventId) => {
    try {
      const response = await api.put(`/events/${eventId}/start`);
      if (response.data.success) {
        alert('Event started');
        fetchEvents();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start event');
    }
  };

  const handleCompleteEvent = async (eventId) => {
    try {
      const response = await api.put(`/events/${eventId}/complete`);
      if (response.data.success) {
        alert('Event completed');
        fetchEvents();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete event');
    }
  };

  const handleHodApprove = async (eventId) => {
    try {
      const response = await api.put(`/approvals/${eventId}/hod-approve`);
      if (response.data.success) {
        alert('Event approved');
        fetchEvents();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve event');
    }
  };

  const handleHodReject = async (eventId) => {
    if (!rejectReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      const response = await api.put(`/approvals/${eventId}/hod-reject`, { reason: rejectReason });
      if (response.data.success) {
        alert('Event rejected');
        setRejectingEventId(null);
        setRejectReason('');
        fetchEvents();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject event');
    }
  };

  const handleDeanApprove = async (eventId) => {
    try {
      const response = await api.put(`/approvals/${eventId}/dean-approve`);
      if (response.data.success) {
        alert('Event approved');
        fetchEvents();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve event');
    }
  };

  const handleHeadApprove = async (eventId) => {
    try {
      const response = await api.put(`/approvals/${eventId}/head-approve`);
      if (response.data.success) {
        alert('Event approved and validated');
        fetchEvents();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve event');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Event Management System</h1>
        <div className="user-info">
          <span>{user?.name} ({user?.role})</span>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </header>

      <nav className="dashboard-nav">
        {user?.role === 'COORDINATOR' && (
          <>
            <button
              className={activeTab === 'my-events' ? 'active' : ''}
              onClick={() => setActiveTab('my-events')}
            >
              My Events
            </button>
            <button
              className={activeTab === 'create-event' ? 'active' : ''}
              onClick={() => setActiveTab('create-event')}
            >
              Create Event
            </button>
          </>
        )}

        {['HOD', 'DEAN', 'HEAD'].includes(user?.role) && (
          <>
            <button
              className={activeTab === 'pending' ? 'active' : ''}
              onClick={() => setActiveTab('pending')}
            >
              Pending Approvals ({pendingEvents.length})
            </button>
            <button
              className={activeTab === 'all-events' ? 'active' : ''}
              onClick={() => setActiveTab('all-events')}
            >
              All Events
            </button>
          </>
        )}

        {user?.role === 'ADMIN' && (
          <>
            <button
              className={activeTab === 'admin' ? 'active' : ''}
              onClick={() => setActiveTab('admin')}
            >
              Administration
            </button>
            <button
              className={activeTab === 'all-events' ? 'active' : ''}
              onClick={() => setActiveTab('all-events')}
            >
              All Events
            </button>
          </>
        )}
      </nav>

      <main className="dashboard-content">
        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            {activeTab === 'my-events' && <MyEventsTab events={events} user={user} onSubmit={handleSubmitEvent} onStart={handleStartEvent} onComplete={handleCompleteEvent} />}

            {activeTab === 'create-event' && <CreateEventTab onEventCreated={fetchEvents} />}

            {activeTab === 'pending' && (
              <div>
                <h2>Pending Approvals</h2>
                {pendingEvents.length === 0 ? (
                  <p>No pending approvals</p>
                ) : (
                  pendingEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onAction={(evt) => (
                        <div>
                          {user?.role === 'HOD' && evt.status === 'SUBMITTED' && (
                            <>
                              <button onClick={() => handleHodApprove(evt.id)} className="btn-success">Approve</button>
                              <button onClick={() => setRejectingEventId(evt.id)} className="btn-danger">Reject</button>
                              {rejectingEventId === evt.id && (
                                <div className="reject-form">
                                  <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Rejection reason..."
                                  />
                                  <button onClick={() => handleHodReject(evt.id)} className="btn-danger">Confirm Reject</button>
                                  <button onClick={() => setRejectingEventId(null)} className="btn-cancel">Cancel</button>
                                </div>
                              )}
                            </>
                          )}
                          {user?.role === 'DEAN' && evt.status === 'HOD_APPROVED' && (
                            <button onClick={() => handleDeanApprove(evt.id)} className="btn-success">Approve</button>
                          )}
                          {user?.role === 'HEAD' && evt.status === 'DEAN_APPROVED' && (
                            <button onClick={() => handleHeadApprove(evt.id)} className="btn-success">Final Approve</button>
                          )}
                        </div>
                      )}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === 'all-events' && (
              <div>
                <h2>All Events</h2>
                {events.length === 0 ? (
                  <p>No events</p>
                ) : (
                  events.map((event) => <EventCard key={event.id} event={event} />)
                )}
              </div>
            )}

            {activeTab === 'admin' && <AdminPanel onRefresh={fetchEvents} />}
          </>
        )}
      </main>
    </div>
  );
}

function MyEventsTab({ events, user, onSubmit, onStart, onComplete }) {
  const myEvents = events.filter((e) => e.coordinator_id === user?.id);

  return (
    <div>
      <h2>My Events</h2>
      {myEvents.length === 0 ? (
        <p>No events created yet</p>
      ) : (
        myEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onAction={(evt) => (
              <div>
                {evt.status === 'DRAFT' && <button onClick={() => onSubmit(evt.id)} className="btn-primary">Submit</button>}
                {evt.status === 'HEAD_APPROVED' && <button onClick={() => onStart(evt.id)} className="btn-warning">Start Event</button>}
                {evt.status === 'RUNNING' && <button onClick={() => onComplete(evt.id)} className="btn-success">Complete</button>}
              </div>
            )}
          />
        ))
      )}
    </div>
  );
}

function CreateEventTab({ onEventCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    venue_id: '',
    start_time: '',
    end_time: '',
    participant_count: '',
    resources: []
  });
  const [venues, setVenues] = useState([]);
  const [resources, setResources] = useState([]);
  const [selectedResources, setSelectedResources] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchVenuesAndResources();
  }, []);

  const fetchVenuesAndResources = async () => {
    try {
      const venueResponse = await api.get('/admin/venues');
      const resourceResponse = await api.get('/admin/resources');

      if (venueResponse.data.success) setVenues(venueResponse.data.venues);
      if (resourceResponse.data.success) setResources(resourceResponse.data.resources);
    } catch (err) {
      console.error('Error fetching data');
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddResource = () => {
    setSelectedResources([...selectedResources, { resource_id: '', quantity: 1 }]);
  };

  const handleResourceChange = (index, field, value) => {
    const updated = [...selectedResources];
    updated[index][field] = value;
    setSelectedResources(updated);
  };

  const handleRemoveResource = (index) => {
    setSelectedResources(selectedResources.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        participant_count: parseInt(formData.participant_count),
        venue_id: parseInt(formData.venue_id),
        resources: selectedResources.map((r) => ({
          resource_id: parseInt(r.resource_id),
          quantity: parseInt(r.quantity)
        }))
      };

      const response = await api.post('/events', payload);
      if (response.data.success) {
        alert('Event created successfully');
        setFormData({
          title: '',
          department: '',
          venue_id: '',
          start_time: '',
          end_time: '',
          participant_count: '',
          resources: []
        });
        setSelectedResources([]);
        onEventCreated();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-event-form">
      <h2>Create New Event</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title:</label>
          <input type="text" name="title" value={formData.title} onChange={handleInputChange} required />
        </div>

        <div className="form-group">
          <label>Department:</label>
          <input type="text" name="department" value={formData.department} onChange={handleInputChange} required />
        </div>

        <div className="form-group">
          <label>Venue:</label>
          <select name="venue_id" value={formData.venue_id} onChange={handleInputChange} required>
            <option value="">Select Venue</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} (Capacity: {v.capacity})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Start Time:</label>
          <input type="datetime-local" name="start_time" value={formData.start_time} onChange={handleInputChange} required />
        </div>

        <div className="form-group">
          <label>End Time:</label>
          <input type="datetime-local" name="end_time" value={formData.end_time} onChange={handleInputChange} required />
        </div>

        <div className="form-group">
          <label>Participant Count:</label>
          <input type="number" name="participant_count" value={formData.participant_count} onChange={handleInputChange} required />
        </div>

        <div className="resources-section">
          <h3>Resources</h3>
          {selectedResources.map((r, i) => (
            <div key={i} className="resource-row">
              <select value={r.resource_id} onChange={(e) => handleResourceChange(i, 'resource_id', e.target.value)} required>
                <option value="">Select Resource</option>
                {resources.map((res) => (
                  <option key={res.id} value={res.id}>
                    {res.name} (Available: {res.total_quantity})
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={r.quantity}
                onChange={(e) => handleResourceChange(i, 'quantity', e.target.value)}
                placeholder="Quantity"
                min="1"
              />
              <button type="button" onClick={() => handleRemoveResource(i)} className="btn-danger">Remove</button>
            </div>
          ))}
          <button type="button" onClick={handleAddResource} className="btn-primary">Add Resource</button>
        </div>

        <button type="submit" disabled={loading} className="btn-submit">
          {loading ? 'Creating...' : 'Create Event'}
        </button>
      </form>
    </div>
  );
}

function AdminPanel({ onRefresh }) {
  const [venueForm, setVenueForm] = useState({ name: '', capacity: '' });
  const [resourceForm, setResourceForm] = useState({ name: '', total_quantity: '' });
  const [loading, setLoading] = useState(false);

  const handleVenueSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/admin/venues', {
        name: venueForm.name,
        capacity: parseInt(venueForm.capacity)
      });
      if (response.data.success) {
        alert('Venue added successfully');
        setVenueForm({ name: '', capacity: '' });
        onRefresh();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add venue');
    } finally {
      setLoading(false);
    }
  };

  const handleResourceSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/admin/resources', {
        name: resourceForm.name,
        total_quantity: parseInt(resourceForm.total_quantity)
      });
      if (response.data.success) {
        alert('Resource added successfully');
        setResourceForm({ name: '', total_quantity: '' });
        onRefresh();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add resource');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-section">
        <h2>Add Venue</h2>
        <form onSubmit={handleVenueSubmit}>
          <input
            type="text"
            placeholder="Venue Name"
            value={venueForm.name}
            onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Capacity"
            value={venueForm.capacity}
            onChange={(e) => setVenueForm({ ...venueForm, capacity: e.target.value })}
            required
          />
          <button type="submit" disabled={loading}>Add Venue</button>
        </form>
      </div>

      <div className="admin-section">
        <h2>Add Resource</h2>
        <form onSubmit={handleResourceSubmit}>
          <input
            type="text"
            placeholder="Resource Name"
            value={resourceForm.name}
            onChange={(e) => setResourceForm({ ...resourceForm, name: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Total Quantity"
            value={resourceForm.total_quantity}
            onChange={(e) => setResourceForm({ ...resourceForm, total_quantity: e.target.value })}
            required
          />
          <button type="submit" disabled={loading}>Add Resource</button>
        </form>
      </div>
    </div>
  );
}
