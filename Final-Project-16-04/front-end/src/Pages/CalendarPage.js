import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { MdAdd, MdClose, MdDelete, MdEdit } from 'react-icons/md';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const localizer = momentLocalizer(moment);

const CalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/calendar/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      const formattedEvents = data.map(event => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      }));
      setEvents(formattedEvents);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSelectSlot = useCallback(({ start, end }) => {
    setSelectedEvent({ start, end, allDay: true });
    setShowModal(true);
  }, []);

  const handleSelectEvent = useCallback((event) => {
    if (event.resource.type === 'task') {
        alert(`Task: ${event.title}\nDue on: ${moment(event.start).format('LL')}`);
        return;
    }
    if (event.resource.type === 'project') {
        alert(`Project Deadline: ${event.title.replace('(Project Deadline) ', '')}\nDue on: ${moment(event.start).format('LL')}`);
        return;
    }
    setSelectedEvent(event);
    setShowModal(true);
  }, []);

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEvent(null);
  };

  const handleSaveEvent = async (eventData) => {
    const isUpdate = !!eventData.id;
    const method = isUpdate ? 'PUT' : 'POST';
    const eventId = isUpdate ? eventData.id.replace('event-', '') : '';
    const url = `${API_BASE_URL}/calendar/events/${eventId}`;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) throw new Error('Failed to save event');
      fetchEvents(); // Refresh events
      handleCloseModal();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    
    const realId = eventId.replace('event-', '');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/calendar/events/${realId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete event');
      fetchEvents(); // Refresh events
      handleCloseModal();
    } catch (err) {
      setError(err.message);
    }
  };

  const eventStyleGetter = (event) => {
    const isTask = event.resource.type === 'task';
    const isProject = event.resource.type === 'project';
    let backgroundColor = '#4299e1'; // Default blue for custom events
    if (isTask) backgroundColor = '#f56565'; // Red for tasks
    if (isProject) backgroundColor = '#f6ad55'; // Orange for project deadlines

    const style = {
      backgroundColor,
      borderRadius: '5px',
      opacity: 0.8,
      color: 'white',
      border: '0px',
      display: 'block',
    };
    return { style };
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
        <button
          onClick={() => {
            setSelectedEvent(null);
            setShowModal(true);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center"
        >
          <MdAdd className="mr-2" /> Add Event
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md" style={{ height: '75vh' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
        />
      </div>

      {showModal && (
        <EventModal
          event={selectedEvent}
          onClose={handleCloseModal}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  );
};

const EventModal = ({ event, onClose, onSave, onDelete }) => {
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.resource?.description || '');
  const [start, setStart] = useState(moment(event?.start).format('YYYY-MM-DDTHH:mm'));
  const [end, setEnd] = useState(moment(event?.end).format('YYYY-MM-DDTHH:mm'));
  const [allDay, setAllDay] = useState(event?.allDay || false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ id: event?.id, title, description, start, end, allDay });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{event?.id ? 'Edit Event' : 'Add Event'}</h2>
          <button onClick={onClose}><MdClose /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              rows="3"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Start</label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="input"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">End</label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="input"
              required
            />
          </div>
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="mr-2"
            />
            <label>All day</label>
          </div>
          <div className="flex justify-between items-center">
            <div>
              {event?.id && (
                <button
                  type="button"
                  onClick={() => onDelete(event.id)}
                  className="btn bg-red-500 text-white hover:bg-red-600"
                >
                  <MdDelete />
                </button>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="btn bg-gray-500 text-white hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn bg-blue-500 text-white hover:bg-blue-600"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CalendarPage; 