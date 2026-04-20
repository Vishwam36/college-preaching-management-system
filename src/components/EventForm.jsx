import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';
import { Check, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { TABLES, FIELDS, FORM_FIELDS } from '../constants';

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
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    fetchEventTypes();
    if (selectedCollege) {
      fetchSpeakers();
      fetchStudentsAndAttendance();
    }
  }, [selectedCollege, selectedYear, initialEventId]);

  async function fetchEventTypes() {
    const { data } = await supabase.from(TABLES.EVENT_TYPES).select('*').order(FIELDS.NAME);
    setEventTypes(data || []);
  }

  async function fetchSpeakers() {
    const { data } = await supabase.from(TABLES.SPEAKERS).select('*').order(FIELDS.NAME);
    setSpeakers(data || []);
  }

  async function fetchStudentsAndAttendance() {
    if (initialEventId) {
      // Fetch existing event
      const { data: event } = await supabase
        .from(TABLES.EVENTS)
        .select('*')
        .eq(FIELDS.ID, initialEventId)
        .single();
      
      if (event) {
        setEventTypeId(event[FIELDS.EVENT_TYPE_ID]);
        setEventDate(event[FIELDS.EVENT_DATE]);
        setSpeakerFeedback(event[FIELDS.SPEAKER_FEEDBACK] || '');
      }

      // Fetch existing speakers
      const { data: eventSpeakers } = await supabase
        .from(TABLES.EVENT_SPEAKERS)
        .select(FIELDS.SPEAKER_ID)
        .eq('event_id', initialEventId);
      setSelectedSpeakers((eventSpeakers || []).map(s => s[FIELDS.SPEAKER_ID]));

      // Fetch all students AND existing attendance
      const { data: allStudents } = await supabase
        .from(TABLES.STUDENTS)
        .select('*')
        .eq(FIELDS.COLLEGE_ID, selectedCollege)
        .order(FIELDS.NAME);
      
      const { data: eventAttendance } = await supabase
        .from(TABLES.EVENT_ATTENDANCE)
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
        .from(TABLES.STUDENTS)
        .select('*')
        .eq(FIELDS.COLLEGE_ID, selectedCollege)
        .order(FIELDS.NAME);
      setStudents(data || []);
      setAttendees((data || []).map(s => ({
        [FIELDS.STUDENT_ID]: s.id,
        [FIELDS.NAME]: s.name,
        attended: false,
        [FIELDS.QUIZ_SCORE]: '',
        [FIELDS.STUDENT_FEEDBACK]: ''
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

  function handleNextStep1() {
    const missing = [];
    if (!eventTypeId) missing.push(FORM_FIELDS.EVENT_TYPE);
    if (!eventDate) missing.push(FORM_FIELDS.EVENT_DATE);

    if (missing.length > 0) {
      setErrors(missing);
      return;
    }
    setErrors([]);
    setStep(2);
  }

  async function handleSubmit() {
    if (!eventTypeId || !eventDate || !selectedCollege || !selectedYear) return;
    setSaving(true);

    const eventPayload = {
      [FIELDS.COLLEGE_ID]: selectedCollege,
      [FIELDS.ACADEMIC_YEAR_ID]: selectedYear,
      [FIELDS.EVENT_TYPE_ID]: eventTypeId,
      [FIELDS.EVENT_DATE]: eventDate,
      [FIELDS.SPEAKER_FEEDBACK]: speakerFeedback
    };

    let eventId = initialEventId;

    if (initialEventId) {
      // Update existing event
      const { error: eventError } = await supabase
        .from(TABLES.EVENTS)
        .update(eventPayload)
        .eq(FIELDS.ID, initialEventId);
      
      if (eventError) {
        alert('Error updating event: ' + eventError.message);
        setSaving(false);
        return;
      }

      // Update speakers: delete and re-insert
      await supabase.from(TABLES.EVENT_SPEAKERS).delete().eq('event_id', initialEventId);
      if (selectedSpeakers.length > 0) {
        await supabase.from(TABLES.EVENT_SPEAKERS).insert(
          selectedSpeakers.map(spkId => ({ event_id: initialEventId, [FIELDS.SPEAKER_ID]: spkId }))
        );
      }

      // Update attendance: delete and re-insert
      await supabase.from(TABLES.EVENT_ATTENDANCE).delete().eq('event_id', initialEventId);
      const attendedStudents = attendees.filter(a => a.attended);
      if (attendedStudents.length > 0) {
        await supabase.from(TABLES.EVENT_ATTENDANCE).insert(
          attendedStudents.map(a => ({
            event_id: initialEventId,
            [FIELDS.STUDENT_ID]: a[FIELDS.STUDENT_ID],
            [FIELDS.QUIZ_SCORE]: a[FIELDS.QUIZ_SCORE] !== '' ? Number(a[FIELDS.QUIZ_SCORE]) : null,
            [FIELDS.STUDENT_FEEDBACK]: a[FIELDS.STUDENT_FEEDBACK] || null
          }))
        );
      }
    } else {
      // Create new event
      const { data: event, error: eventError } = await supabase
        .from(TABLES.EVENTS)
        .insert(eventPayload)
        .select()
        .single();

      if (eventError) {
        alert('Error creating event: ' + eventError.message);
        setSaving(false);
        return;
      }
      eventId = event[FIELDS.ID];

      // Add speakers
      if (selectedSpeakers.length > 0) {
        await supabase.from(TABLES.EVENT_SPEAKERS).insert(
          selectedSpeakers.map(spkId => ({ event_id: eventId, [FIELDS.SPEAKER_ID]: spkId }))
        );
      }

      // Add attendance
      const attendedStudents = attendees.filter(a => a.attended);
      if (attendedStudents.length > 0) {
        await supabase.from(TABLES.EVENT_ATTENDANCE).insert(
          attendedStudents.map(a => ({
            event_id: eventId,
            [FIELDS.STUDENT_ID]: a[FIELDS.STUDENT_ID],
            [FIELDS.QUIZ_SCORE]: a[FIELDS.QUIZ_SCORE] !== '' ? Number(a[FIELDS.QUIZ_SCORE]) : null,
            [FIELDS.STUDENT_FEEDBACK]: a[FIELDS.STUDENT_FEEDBACK] || null
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
              <select className={`form-select ${errors.includes(FORM_FIELDS.EVENT_TYPE) ? 'form-input-error' : ''}`} value={eventTypeId} onChange={e => { setEventTypeId(e.target.value); if (errors.includes(FORM_FIELDS.EVENT_TYPE)) setErrors(prev => prev.filter(x => x !== FORM_FIELDS.EVENT_TYPE)); }}>
                <option value="">Select event type…</option>
                {eventTypes.map(t => <option key={t.id} value={t.id}>{t[FIELDS.NAME]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Event Date</label>
              <input type="date" className={`form-input ${errors.includes(FORM_FIELDS.EVENT_DATE) ? 'form-input-error' : ''}`} value={eventDate} onChange={e => { setEventDate(e.target.value); if (errors.includes(FORM_FIELDS.EVENT_DATE)) setErrors(prev => prev.filter(x => x !== FORM_FIELDS.EVENT_DATE)); }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              {onCancel && <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>}
              <button className="btn btn-primary" onClick={handleNextStep1}>
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
                      <tr key={a[FIELDS.STUDENT_ID]}>
                        <td>
                          <input
                            type="checkbox"
                            checked={a.attended}
                            onChange={() => toggleAttendee(a[FIELDS.STUDENT_ID])}
                          />
                        </td>
                        <td style={{ fontWeight: 500, fontSize: 'var(--font-sm)' }}>{a[FIELDS.NAME]}</td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            style={{ height: 28, padding: '2px 4px', fontSize: 'var(--font-xs)' }}
                            value={a[FIELDS.QUIZ_SCORE]}
                            onChange={e => updateAttendee(a[FIELDS.STUDENT_ID], FIELDS.QUIZ_SCORE, e.target.value)}
                            disabled={!a.attended}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            style={{ height: 28, padding: '2px 4px', fontSize: 'var(--font-xs)' }}
                            value={a[FIELDS.STUDENT_FEEDBACK]}
                            onChange={e => updateAttendee(a[FIELDS.STUDENT_ID], FIELDS.STUDENT_FEEDBACK, e.target.value)}
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
                <p style={{ fontWeight: 600 }}>{eventTypes.find(t => t.id === eventTypeId)?.[FIELDS.NAME]}</p>
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
