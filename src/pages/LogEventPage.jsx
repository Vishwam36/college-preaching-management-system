import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { CalendarPlus, Check, ChevronRight, ChevronLeft } from 'lucide-react';

export default function LogEventPage() {
  const { selectedCollege, selectedYear } = useApp();
  const [step, setStep] = useState(1);
  const [eventTypes, setEventTypes] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [students, setStudents] = useState([]);

  // Form state
  const [eventTypeId, setEventTypeId] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSpeakers, setSelectedSpeakers] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [speakerFeedback, setSpeakerFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchEventTypes();
    if (selectedCollege) {
      fetchSpeakers();
      fetchStudents();
    }
  }, [selectedCollege, selectedYear]);

  async function fetchEventTypes() {
    const { data } = await supabase.from('event_types').select('*').order('name');
    setEventTypes(data || []);
  }

  async function fetchSpeakers() {
    let query = supabase.from('speakers').select('*').order('name');
    const { data } = await query;
    setSpeakers(data || []);
  }

  async function fetchStudents() {
    let query = supabase.from('students').select('*').order('name');
    if (selectedCollege) query = query.eq('college_id', selectedCollege);
    const { data } = await query;
    setStudents(data || []);
    setAttendees((data || []).map(s => ({
      student_id: s.id,
      name: s.name,
      attended: false,
      quiz_score: '',
      student_feedback: ''
    })));
  }

  function toggleAttendee(studentId) {
    setAttendees(prev => prev.map(a =>
      a.student_id === studentId ? { ...a, attended: !a.attended } : a
    ));
  }

  function updateAttendee(studentId, field, value) {
    setAttendees(prev => prev.map(a =>
      a.student_id === studentId ? { ...a, [field]: value } : a
    ));
  }

  async function handleSubmit() {
    if (!eventTypeId || !eventDate || !selectedCollege || !selectedYear) return;
    setSaving(true);

    // Create event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        college_id: selectedCollege,
        academic_year_id: selectedYear,
        event_type_id: eventTypeId,
        event_date: eventDate,
        speaker_feedback: speakerFeedback
      })
      .select()
      .single();

    if (eventError) {
      alert('Error creating event: ' + eventError.message);
      setSaving(false);
      return;
    }

    // Add speakers
    if (selectedSpeakers.length > 0) {
      await supabase.from('event_speakers').insert(
        selectedSpeakers.map(spkId => ({ event_id: event.id, speaker_id: spkId }))
      );
    }

    // Add attendance
    const attendedStudents = attendees.filter(a => a.attended);
    if (attendedStudents.length > 0) {
      await supabase.from('event_attendance').insert(
        attendedStudents.map(a => ({
          event_id: event.id,
          student_id: a.student_id,
          quiz_score: a.quiz_score !== '' ? Number(a.quiz_score) : null,
          student_feedback: a.student_feedback || null
        }))
      );
    }

    setSaving(false);
    setSuccess(true);
    // Reset after 2s
    setTimeout(() => {
      setSuccess(false);
      setStep(1);
      setEventTypeId('');
      setEventDate(new Date().toISOString().split('T')[0]);
      setSelectedSpeakers([]);
      setSpeakerFeedback('');
      fetchStudents();
    }, 2000);
  }

  const attended = attendees.filter(a => a.attended);

  if (!selectedCollege || !selectedYear) {
    return (
      <div className="empty-state">
        <CalendarPlus size={48} />
        <h3>Select College & Year</h3>
        <p>Please select a college and academic year from the header to log an event.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="empty-state" style={{ animation: 'fadeIn 0.3s ease' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
          <Check size={32} style={{ color: 'var(--success)' }} />
        </div>
        <h3>Event Logged Successfully!</h3>
        <p>{attended.length} student(s) marked as attended.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Log Event</h2>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        {['Event Details', 'Speakers', 'Attendance & Scores', 'Review'].map((label, i) => (
          <div key={label} style={{
            flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', textAlign: 'center',
            fontSize: 'var(--font-sm)', fontWeight: 600,
            background: step === i + 1 ? 'var(--accent-glow)' : 'var(--bg-card)',
            color: step === i + 1 ? 'var(--text-accent)' : step > i + 1 ? 'var(--success)' : 'var(--text-muted)',
            border: `1px solid ${step === i + 1 ? 'var(--border-accent)' : 'var(--border-primary)'}`,
            cursor: step > i + 1 ? 'pointer' : 'default',
            transition: 'all var(--transition-fast)'
          }} onClick={() => step > i + 1 && setStep(i + 1)}>
            {step > i + 1 ? '✓ ' : ''}{label}
          </div>
        ))}
      </div>

      <div className="card" style={{ maxWidth: 800 }}>
        {/* Step 1: Event details */}
        {step === 1 && (
          <div>
            <div className="form-group">
              <label className="form-label">Event Type (Topic)</label>
              <select className="form-select" value={eventTypeId} onChange={e => setEventTypeId(e.target.value)} id="event-type-select">
                <option value="">Select event type…</option>
                {eventTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Event Date</label>
              <input type="date" className="form-input" value={eventDate} onChange={e => setEventDate(e.target.value)} id="event-date-input" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!eventTypeId || !eventDate}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Speakers */}
        {step === 2 && (
          <div>
            <div className="form-group">
              <label className="form-label">Select Speakers</label>
              <div className="checkbox-list">
                {speakers.map(s => (
                  <div className="checkbox-item" key={s.id}>
                    <input
                      type="checkbox"
                      id={`speaker-${s.id}`}
                      checked={selectedSpeakers.includes(s.id)}
                      onChange={() => {
                        setSelectedSpeakers(prev =>
                          prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                        );
                      }}
                    />
                    <label htmlFor={`speaker-${s.id}`}>{s.name}</label>
                  </div>
                ))}
                {speakers.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)', padding: 'var(--space-3)' }}>
                    No speakers found. Add speakers in Manage section.
                  </p>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>
                <ChevronLeft size={16} /> Back
              </button>
              <button className="btn btn-primary" onClick={() => setStep(3)}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Attendance & Scores */}
        {step === 3 && (
          <div>
            <div className="form-group">
              <label className="form-label">Mark Attendance & Enter Quiz Scores</label>
              <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 48 }}>✓</th>
                      <th>Student</th>
                      <th style={{ width: 100 }}>Quiz Score</th>
                      <th>Feedback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendees.map(a => (
                      <tr key={a.student_id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={a.attended}
                            onChange={() => toggleAttendee(a.student_id)}
                            style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                          />
                        </td>
                        <td style={{ fontWeight: 500 }}>{a.name}</td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            style={{ height: 32, padding: '4px 8px', fontSize: 'var(--font-sm)' }}
                            value={a.quiz_score}
                            onChange={e => updateAttendee(a.student_id, 'quiz_score', e.target.value)}
                            disabled={!a.attended}
                            placeholder="—"
                            min="0"
                            max="100"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            style={{ height: 32, padding: '4px 8px', fontSize: 'var(--font-sm)' }}
                            value={a.student_feedback}
                            onChange={e => updateAttendee(a.student_id, 'student_feedback', e.target.value)}
                            disabled={!a.attended}
                            placeholder="Optional feedback"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
                {attended.length} / {attendees.length} students selected
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Overall Speaker Feedback (about the session)</label>
              <textarea
                className="form-textarea"
                value={speakerFeedback}
                onChange={e => setSpeakerFeedback(e.target.value)}
                placeholder="How did the overall session go?"
                rows={3}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>
                <ChevronLeft size={16} /> Back
              </button>
              <button className="btn btn-primary" onClick={() => setStep(4)}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div>
            <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-4)' }}>Review & Submit</h3>
            <div style={{ display: 'grid', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
              <div style={{ padding: 'var(--space-4)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>Event Type</p>
                <p style={{ fontWeight: 600 }}>{eventTypes.find(t => t.id === eventTypeId)?.name}</p>
              </div>
              <div style={{ padding: 'var(--space-4)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>Date</p>
                <p style={{ fontWeight: 600 }}>{new Date(eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div style={{ padding: 'var(--space-4)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>Speakers</p>
                <p style={{ fontWeight: 600 }}>{selectedSpeakers.map(id => speakers.find(s => s.id === id)?.name).join(', ') || 'None selected'}</p>
              </div>
              <div style={{ padding: 'var(--space-4)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>Attendance</p>
                <p style={{ fontWeight: 600 }}>{attended.length} students</p>
              </div>
              {speakerFeedback && (
                <div style={{ padding: 'var(--space-4)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>Speaker Feedback</p>
                  <p style={{ fontWeight: 500, fontSize: 'var(--font-sm)' }}>{speakerFeedback}</p>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(3)}>
                <ChevronLeft size={16} /> Back
              </button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving…' : '✓ Submit Event'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
