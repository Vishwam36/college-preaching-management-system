import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { History, Eye, X, Users as UsersIcon, Edit } from 'lucide-react';
import { TABLES, FIELDS } from '../constants';
import EventForm from '../components/EventForm';

export default function EventHistoryPage() {
  const { selectedCollege, selectedYear } = useApp();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [detailAttendees, setDetailAttendees] = useState([]);
  const [detailSpeakers, setDetailSpeakers] = useState([]);
  const [editEventId, setEditEventId] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, [selectedCollege, selectedYear]);

  async function fetchEvents() {
    setLoading(true);
    let query = supabase
      .from(TABLES.EVENTS)
      .select(`*, ${TABLES.EVENT_TYPES}(${FIELDS.NAME}), ${TABLES.COLLEGES}(${FIELDS.NAME})`)
      .order(FIELDS.EVENT_DATE, { ascending: false });
    if (selectedCollege) query = query.eq(FIELDS.COLLEGE_ID, selectedCollege);
    if (selectedYear) query = query.eq(FIELDS.ACADEMIC_YEAR_ID, selectedYear);
    const { data } = await query;
    setEvents(data || []);
    setLoading(false);
  }

  async function openDetail(event) {
    setDetail(event);
    // Fetch attendees
    const { data: att } = await supabase
      .from(TABLES.EVENT_ATTENDANCE)
      .select(`*, ${TABLES.STUDENTS}(${FIELDS.NAME})`)
      .eq('event_id', event.id);
    setDetailAttendees(att || []);
    // Fetch speakers
    const { data: spk } = await supabase
      .from(TABLES.EVENT_SPEAKERS)
      .select(`*, ${TABLES.SPEAKERS}(${FIELDS.NAME})`)
      .eq('event_id', event.id);
    setDetailSpeakers(spk || []);
  }

  if (loading) {
    return <div className="page-loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Event History</h2>

      {events.length === 0 ? (
        <div className="empty-state">
          <History size={48} />
          <h3>No events found</h3>
          <p>Log an event to see it here.</p>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Event Type</th>
                <th>College</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event.id}>
                  <td>{new Date(event[FIELDS.EVENT_DATE]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td style={{ color: 'var(--text-accent)', fontWeight: 500 }}>{event[TABLES.EVENT_TYPES]?.[FIELDS.NAME]}</td>
                  <td>{event[TABLES.COLLEGES]?.[FIELDS.NAME]}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => openDetail(event)}>
                      <Eye size={14} /> View
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-accent)' }} onClick={() => setEditEventId(event.id)}>
                      <Edit size={14} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{detail.event_types?.name}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetail(null)}>
                <X size={18} />
              </button>
            </div>
             <div className="modal-body">
              <div className="form-row" style={{ marginBottom: 'var(--space-5)' }}>
                <div>
                  <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>Date</p>
                  <p style={{ fontWeight: 600 }}>{new Date(detail[FIELDS.EVENT_DATE]).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div>
                  <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>College</p>
                  <p style={{ fontWeight: 600 }}>{detail[TABLES.COLLEGES]?.[FIELDS.NAME]}</p>
                </div>
              </div>

              {detail[FIELDS.SPEAKER_FEEDBACK] && (
                <div style={{ marginBottom: 'var(--space-5)' }}>
                  <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>Speaker Feedback</p>
                  <p style={{ fontWeight: 500, fontSize: 'var(--font-sm)', padding: 'var(--space-3)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>{detail[FIELDS.SPEAKER_FEEDBACK]}</p>
                </div>
              )}

              <div style={{ marginBottom: 'var(--space-5)' }}>
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                  Speakers ({detailSpeakers.length})
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {detailSpeakers.map(s => (
                    <span key={s.id} className="badge badge-active">{s.speakers?.name}</span>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <UsersIcon size={14} /> Attendance ({detailAttendees.length})
                </p>
                {detailAttendees.length > 0 ? (
                  <div className="data-table-wrapper" style={{ maxHeight: 300, overflow: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Quiz Score</th>
                          <th>Feedback</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailAttendees.map(a => (
                          <tr key={a.id}>
                            <td style={{ fontWeight: 500 }}>{a.students?.name}</td>
                            <td>{a.quiz_score != null ? a.quiz_score : '—'}</td>
                            <td style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>{a.student_feedback || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>No attendance recorded</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {editEventId && (
        <div className="modal-overlay" onClick={() => setEditEventId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>Edit Event</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditEventId(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <EventForm 
                initialEventId={editEventId} 
                onSuccess={() => {
                  setEditEventId(null);
                  fetchEvents();
                }}
                onCancel={() => setEditEventId(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
