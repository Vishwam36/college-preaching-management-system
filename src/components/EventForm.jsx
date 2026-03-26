import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';
import { Check, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';

export default function EventForm({ initialEventId = null, onSuccess, onCancel }) {
  const { selectedCollege, selectedYear } = useApp();
  const [step, setStep] = useState(1);
  const [eventTypes, setEventTypes] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [students, setStudents] = useState([]);
  const [initialLoading, setInitialLoading] = useState(!!initialEventId);

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
      fetchStudentsAndAttendance();
    }
  }, [selectedCollege, selectedYear, initialEventId]);

  async function fetchEventTypes() {
    const { data } = await supabase.from('event_types').select('*').order('name');
    setEventTypes(data || []);
  }

  async function fetchSpeakers() {
    const { data } = await supabase.from('speakers').select('*').order('name');
    setSpeakers(data || []);
  }

  async function fetchStudentsAndAttendance() {
    if (initialEventId) {
      // Fetch existing event
      const { data: event } = await supabase
        .from('events')
        .select('*')
        .eq('id', initialEventId)
        .single();
      
      if (event) {
        setEventTypeId(event.event_type_id);
        setEventDate(event.event_date);
        setSpeakerFeedback(event.speaker_feedback || '');
      }

      // Fetch existing speakers
      const { data: eventSpeakers } = await supabase
        .from('event_speakers')
        .select('speaker_id')
        .eq('event_id', initialEventId);
      setSelectedSpeakers((eventSpeakers || []).map(s => s.speaker_id));

      // Fetch all students AND existing attendance
      const { data: allStudents } = await supabase
        .from('students')
        .select('*')
        .eq('college_id', selectedCollege)
        .order('name');
      
      const { data: eventAttendance } = await supabase
        .from('event_attendance')
        .select('*')
        .eq('event_id', initialEventId);
      
      const attendanceMap = {};
      (eventAttendance || []).forEach(a => {
        attendanceMap[a.student_id] = a;
      });

      setAttendees((allStudents || []).map(s => ({
        student_id: s.id,
        name: s.name,
        attended: !!attendanceMap[s.id],
        quiz_score: attendanceMap[s.id]?.quiz_score ?? '',
        student_feedback: attendanceMap[s.id]?.student_feedback ?? ''
      })));
      setInitialLoading(false);
    } else {
      // Fetch only students for new event
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('college_id', selectedCollege)
        .order('name');
      setStudents(data || []);
      setAttendees((data || []).map(s => ({
        student_id: s.id,
        name: s.name,
        attended: false,
        quiz_score: '',
        student_feedback: ''
      })));
    }
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

    const eventPayload = {
      college_id: selectedCollege,
      academic_year_id: selectedYear,
      event_type_id: eventTypeId,
      event_date: eventDate,
      speaker_feedback: speakerFeedback
    };

    let eventId = initialEventId;

    if (initialEventId) {
      // Update existing event
      const { error: eventError } = await supabase
        .from('events')
        .update(eventPayload)
        .eq('id', initialEventId);
      
      if (eventError) {
        alert('Error updating event: ' + eventError.message);
        setSaving(false);
        return;
      }

      // Update speakers: delete and re-insert
      await supabase.from('event_speakers').delete().eq('event_id', initialEventId);
      if (selectedSpeakers.length > 0) {
        await supabase.from('event_speakers').insert(
          selectedSpeakers.map(spkId => ({ event_id: initialEventId, speaker_id: spkId }))
        );
      }

      // Update attendance: delete and re-insert
      await supabase.from('event_attendance').delete().eq('event_id', initialEventId);
      const attendedStudents = attendees.filter(a => a.attended);
      if (attendedStudents.length > 0) {
        await supabase.from('event_attendance').insert(
          attendedStudents.map(a => ({
            event_id: initialEventId,
            student_id: a.student_id,
            quiz_score: a.quiz_score !== '' ? Number(a.quiz_score) : null,
            student_feedback: a.student_feedback || null
          }))
        );
      }
    } else {
      // Create new event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert(eventPayload)
        .select()
        .single();

      if (eventError) {
        alert('Error creating event: ' + eventError.message);
        setSaving(false);
        return;
      }
      eventId = event.id;

      // Add speakers
      if (selectedSpeakers.length > 0) {
        await supabase.from('event_speakers').insert(
          selectedSpeakers.map(spkId => ({ event_id: eventId, speaker_id: spkId }))
        );
      }

      // Add attendance
      const attendedStudents = attendees.filter(a => a.attended);
      if (attendedStudents.length > 0) {
        await supabase.from('event_attendance').insert(
          attendedStudents.map(a => ({
            event_id: eventId,
            student_id: a.student_id,
            quiz_score: a.quiz_score !== '' ? Number(a.quiz_score) : null,
            student_feedback: a.student_feedback || null
          }))
        );
      }
    }

    setSaving(false);
    setSuccess(true);
    
    setTimeout(() => {
      setSuccess(false);
      onSuccess?.();
    }, 1500);
  }

  const attended = attendees.filter(a => a.attended);

  if (initialLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-10)' }}>
        <Loader2 className="spinner" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="empty-state" style={{ animation: 'fadeIn 0.3s ease' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
          <Check size={32} style={{ color: 'var(--success)' }} />
        </div>
        <h3>{initialEventId ? 'Event Updated!' : 'Event Logged Successfully!'}</h3>
        <p>{attended.length} student(s) marked as attended.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        {['Event Details', 'Speakers', 'Attendance', 'Review'].map((label, i) => (
          <div key={label} style={{
            flex: 1, padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', textAlign: 'center',
            fontSize: 'var(--font-xs)', fontWeight: 600,
            background: step === i + 1 ? 'var(--accent-glow)' : 'var(--bg-card)',
            color: step === i + 1 ? 'var(--text-accent)' : step > i + 1 ? 'var(--success)' : 'var(--text-muted)',
            border: `1px solid ${step === i + 1 ? 'var(--border-accent)' : 'var(--border-primary)'}`,
            cursor: step > i + 1 ? 'pointer' : 'default',
            transition: 'all var(--transition-fast)'
          }} onClick={() => step > i + 1 && setStep(i + 1)}>
            {label}
          </div>
        ))}
      </div>

      <div>
        {/* Step 1: Event details */}
        {step === 1 && (
          <div>
            <div className="form-group">
              <label className="form-label">Event Type (Topic)</label>
              <select className="form-select" value={eventTypeId} onChange={e => setEventTypeId(e.target.value)}>
                <option value="">Select event type…</option>
                {eventTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Event Date</label>
              <input type="date" className="form-input" value={eventDate} onChange={e => setEventDate(e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              {onCancel && <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>}
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
              <div className="checkbox-list" style={{ maxHeight: 250, overflowY: 'auto' }}>
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
              <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>✓</th>
                      <th>Student</th>
                      <th style={{ width: 80 }}>Quiz</th>
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
                          />
                        </td>
                        <td style={{ fontWeight: 500, fontSize: 'var(--font-sm)' }}>{a.name}</td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            style={{ height: 28, padding: '2px 4px', fontSize: 'var(--font-xs)' }}
                            value={a.quiz_score}
                            onChange={e => updateAttendee(a.student_id, 'quiz_score', e.target.value)}
                            disabled={!a.attended}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            style={{ height: 28, padding: '2px 4px', fontSize: 'var(--font-xs)' }}
                            value={a.student_feedback}
                            onChange={e => updateAttendee(a.student_id, 'student_feedback', e.target.value)}
                            disabled={!a.attended}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Speaker Feedback</label>
              <textarea
                className="form-textarea"
                value={speakerFeedback}
                onChange={e => setSpeakerFeedback(e.target.value)}
                rows={2}
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
            <div style={{ display: 'grid', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-sm)' }}>
              <div style={{ padding: 'var(--space-2)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>Topic</p>
                <p style={{ fontWeight: 600 }}>{eventTypes.find(t => t.id === eventTypeId)?.name}</p>
              </div>
              <div style={{ padding: 'var(--space-2)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>Date</p>
                <p style={{ fontWeight: 600 }}>{eventDate}</p>
              </div>
              <div style={{ padding: 'var(--space-2)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>Attendance</p>
                <p style={{ fontWeight: 600 }}>{attended.length} students</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(3)}>
                <ChevronLeft size={16} /> Back
              </button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving…' : '✓ Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
