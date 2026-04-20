import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';
import { Check, ChevronRight, ChevronLeft, Loader2, Plus, X } from 'lucide-react';
import { TABLES, FIELDS, FORM_FIELDS } from '../constants';
import Combobox from './Combobox';


/* ─── Main EventForm ─────────────────────────────────── */
export default function EventForm({ initialEventId = null, onSuccess, onCancel }) {
  const { selectedCollege, selectedYear } = useApp();
  const [step, setStep] = useState(1);
  const [eventTypes, setEventTypes] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [initialLoading, setInitialLoading] = useState(!!initialEventId);

  // Form state
  // eventType: { id, label, isNew } | null
  const [eventType, setEventType] = useState(null);
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSpeakers, setSelectedSpeakers] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [speakerFeedback, setSpeakerFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState([]);
  const [addingEventType, setAddingEventType] = useState(false);

  // Quick-add speaker state
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [newSpeakerEmail, setNewSpeakerEmail] = useState('');
  const [addingSpeaker, setAddingSpeaker] = useState(false);

  // Quick-add student state
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);

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
      const { data: event } = await supabase
        .from(TABLES.EVENTS)
        .select('*')
        .eq(FIELDS.ID, initialEventId)
        .single();

      if (event) {
        setEventDate(event[FIELDS.EVENT_DATE]);
        setSpeakerFeedback(event[FIELDS.SPEAKER_FEEDBACK] || '');
        // We'll resolve eventType after eventTypes loads — set a temp placeholder
        setEventType({ id: event[FIELDS.EVENT_TYPE_ID], label: '', isNew: false });
      }

      const { data: eventSpeakers } = await supabase
        .from(TABLES.EVENT_SPEAKERS)
        .select(FIELDS.SPEAKER_ID)
        .eq('event_id', initialEventId);
      setSelectedSpeakers((eventSpeakers || []).map(s => s[FIELDS.SPEAKER_ID]));

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
      (eventAttendance || []).forEach(a => { attendanceMap[a.student_id] = a; });

      setAttendees((allStudents || []).map(s => ({
        student_id: s.id,
        name: s.name,
        attended: !!attendanceMap[s.id],
        quiz_score: attendanceMap[s.id]?.quiz_score ?? '',
        student_feedback: attendanceMap[s.id]?.student_feedback ?? ''
      })));
      setInitialLoading(false);
    } else {
      const { data } = await supabase
        .from(TABLES.STUDENTS)
        .select('*')
        .eq(FIELDS.COLLEGE_ID, selectedCollege)
        .order(FIELDS.NAME);
      setAttendees((data || []).map(s => ({
        student_id: s.id,
        name: s.name,
        attended: false,
        quiz_score: '',
        student_feedback: ''
      })));
    }
  }

  // Resolve label for edit mode once eventTypes is loaded
  useEffect(() => {
    if (eventType?.id && !eventType.label && eventTypes.length > 0) {
      const found = eventTypes.find(t => t.id === eventType.id);
      if (found) setEventType({ id: found.id, label: found.name, isNew: false });
    }
  }, [eventTypes, eventType?.id]);

  // Insert new event type immediately on selection (not deferred to submit)
  async function handleEventTypeChange(val) {
    if (!val) { setEventType(null); return; }
    if (!val.isNew) { setEventType(val); return; }
    // isNew: insert into DB right now
    setAddingEventType(true);
    const { data, error } = await supabase
      .from(TABLES.EVENT_TYPES)
      .insert({ name: val.label })
      .select()
      .single();
    setAddingEventType(false);
    if (error) { alert('Error adding event type: ' + error.message); return; }
    setEventTypes(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setEventType({ id: data.id, label: data.name, isNew: false });
    if (errors.includes(FORM_FIELDS.EVENT_TYPE)) setErrors(prev => prev.filter(x => x !== FORM_FIELDS.EVENT_TYPE));
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

  async function handleAddSpeaker() {
    if (!newSpeakerName.trim()) return;
    if (!newSpeakerEmail.trim()) {
      alert('Email is required for a new speaker (it must be unique in the database).');
      return;
    }
    setAddingSpeaker(true);
    const { data, error } = await supabase
      .from(TABLES.SPEAKERS)
      .insert({ name: newSpeakerName.trim(), email: newSpeakerEmail.trim() })
      .select()
      .single();
    setAddingSpeaker(false);
    if (error) {
      alert('Error adding speaker: ' + error.message);
      return;
    }
    setSpeakers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedSpeakers(prev => [...prev, data.id]);
    setNewSpeakerName('');
    setNewSpeakerEmail('');
    setShowAddSpeaker(false);
  }

  async function handleAddStudent() {
    if (!newStudentName.trim()) return;
    setAddingStudent(true);
    const { data, error } = await supabase
      .from(TABLES.STUDENTS)
      .insert({ name: newStudentName.trim(), college_id: selectedCollege, status: 'active' })
      .select()
      .single();
    if (!error && data) {
      setAttendees(prev => [...prev, {
        student_id: data.id,
        name: data.name,
        attended: true,
        quiz_score: '',
        student_feedback: ''
      }]);
    }
    setNewStudentName('');
    setShowAddStudent(false);
    setAddingStudent(false);
  }

  function handleNextStep1() {
    const missing = [];
    if (!eventType?.id && !eventType?.isNew) missing.push(FORM_FIELDS.EVENT_TYPE);
    if (!eventDate) missing.push(FORM_FIELDS.EVENT_DATE);
    if (missing.length > 0) { setErrors(missing); return; }
    setErrors([]);
    setStep(2);
  }

  // By submit time, eventType.id is always set (newly created types are inserted immediately on selection)
  function resolveEventTypeId() {
    return eventType?.id || null;
  }

  async function handleSubmit() {
    if (!eventDate || !selectedCollege || !selectedYear || !eventType) return;
    setSaving(true);

    const resolvedEventTypeId = resolveEventTypeId();
    if (!resolvedEventTypeId) { setSaving(false); return; }

    const eventPayload = {
      [FIELDS.COLLEGE_ID]: selectedCollege,
      [FIELDS.ACADEMIC_YEAR_ID]: selectedYear,
      [FIELDS.EVENT_TYPE_ID]: resolvedEventTypeId,
      [FIELDS.EVENT_DATE]: eventDate,
      [FIELDS.SPEAKER_FEEDBACK]: speakerFeedback
    };

    let eventId = initialEventId;

    if (initialEventId) {
      const { error } = await supabase.from(TABLES.EVENTS).update(eventPayload).eq(FIELDS.ID, initialEventId);
      if (error) { alert('Error updating event: ' + error.message); setSaving(false); return; }

      await supabase.from(TABLES.EVENT_SPEAKERS).delete().eq('event_id', initialEventId);
      if (selectedSpeakers.length > 0) {
        await supabase.from(TABLES.EVENT_SPEAKERS).insert(
          selectedSpeakers.map(spkId => ({ event_id: initialEventId, [FIELDS.SPEAKER_ID]: spkId }))
        );
      }
      await supabase.from(TABLES.EVENT_ATTENDANCE).delete().eq('event_id', initialEventId);
      const attended = attendees.filter(a => a.attended);
      if (attended.length > 0) {
        await supabase.from(TABLES.EVENT_ATTENDANCE).insert(
          attended.map(a => ({
            event_id: initialEventId,
            [FIELDS.STUDENT_ID]: a.student_id,
            [FIELDS.QUIZ_SCORE]: a.quiz_score !== '' ? Number(a.quiz_score) : null,
            [FIELDS.STUDENT_FEEDBACK]: a.student_feedback || null
          }))
        );
      }
    } else {
      const { data: event, error } = await supabase.from(TABLES.EVENTS).insert(eventPayload).select().single();
      if (error) { alert('Error creating event: ' + error.message); setSaving(false); return; }
      eventId = event[FIELDS.ID];

      if (selectedSpeakers.length > 0) {
        await supabase.from(TABLES.EVENT_SPEAKERS).insert(
          selectedSpeakers.map(spkId => ({ event_id: eventId, [FIELDS.SPEAKER_ID]: spkId }))
        );
      }
      const attended = attendees.filter(a => a.attended);
      if (attended.length > 0) {
        await supabase.from(TABLES.EVENT_ATTENDANCE).insert(
          attended.map(a => ({
            event_id: eventId,
            [FIELDS.STUDENT_ID]: a.student_id,
            [FIELDS.QUIZ_SCORE]: a.quiz_score !== '' ? Number(a.quiz_score) : null,
            [FIELDS.STUDENT_FEEDBACK]: a.student_feedback || null
          }))
        );
      }
    }

    setSaving(false);
    setSuccess(true);
    setTimeout(() => { setSuccess(false); onSuccess?.(); }, 1500);
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
              <Combobox
                options={eventTypes}
                value={eventType}
                onChange={handleEventTypeChange}
                placeholder="Search or type a new event type…"
                addLabel='Add "{query}" as new event type'
                emptyText="No event types yet. Type to create one."
                hasError={errors.includes(FORM_FIELDS.EVENT_TYPE)}
              />
              {addingEventType && <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-accent)', marginTop: 4 }}>Adding new event type…</p>}
              {errors.includes(FORM_FIELDS.EVENT_TYPE) && (
                <p style={{ fontSize: 'var(--font-xs)', color: 'var(--danger)', marginTop: 4 }}>Please select or enter an event type.</p>
              )}
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
              <div className="checkbox-list" style={{ maxHeight: 220, overflowY: 'auto' }}>
                {speakers.map(s => (
                  <div className="checkbox-item" key={s.id}>
                    <input
                      type="checkbox"
                      id={`speaker-${s.id}`}
                      checked={selectedSpeakers.includes(s.id)}
                      onChange={() => setSelectedSpeakers(prev =>
                        prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                      )}
                    />
                    <label htmlFor={`speaker-${s.id}`}>{s.name}</label>
                  </div>
                ))}
                {speakers.length === 0 && (
                  <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', padding: 'var(--space-2)' }}>No speakers yet. Add one below.</p>
                )}
              </div>

              {/* Inline add speaker */}
              {!showAddSpeaker ? (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 'var(--space-2)', color: 'var(--text-accent)' }} onClick={() => setShowAddSpeaker(true)}>
                  <Plus size={14} /> Add new speaker
                </button>
              ) : (
                <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', border: '1px dashed var(--border-accent)', borderRadius: 'var(--radius-md)', background: 'var(--accent-glow)' }}>
                  <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-accent)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>New Speaker</p>
                  <div className="form-row">
                    <input className="form-input" placeholder="Name *" value={newSpeakerName} onChange={e => setNewSpeakerName(e.target.value)} />
                    <input className="form-input" placeholder="Email *" value={newSpeakerEmail} onChange={e => setNewSpeakerEmail(e.target.value)} />
                  </div>
                  <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>Both fields are required. Email must be unique.</p>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    <button className="btn btn-primary btn-sm" onClick={handleAddSpeaker} disabled={addingSpeaker || !newSpeakerName.trim() || !newSpeakerEmail.trim()}>
                      {addingSpeaker ? 'Adding…' : 'Add & Select'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddSpeaker(false); setNewSpeakerName(''); setNewSpeakerEmail(''); }}>
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}><ChevronLeft size={16} /> Back</button>
              <button className="btn btn-primary" onClick={() => setStep(3)}>Next <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {/* Step 3: Attendance & Scores */}
        {step === 3 && (
          <div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <label className="form-label" style={{ margin: 0 }}>Mark Attendance & Enter Quiz Scores</label>
                {!showAddStudent && (
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-accent)' }} onClick={() => setShowAddStudent(true)}>
                    <Plus size={14} /> New Student
                  </button>
                )}
              </div>

              {/* Inline add student */}
              {showAddStudent && (
                <div style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-3)', border: '1px dashed var(--border-accent)', borderRadius: 'var(--radius-md)', background: 'var(--accent-glow)' }}>
                  <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-accent)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Add New Student</p>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <input className="form-input" placeholder="Student name *" value={newStudentName} onChange={e => setNewStudentName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddStudent()} style={{ flex: 1 }} />
                    <button className="btn btn-primary btn-sm" onClick={handleAddStudent} disabled={addingStudent || !newStudentName.trim()}>
                      {addingStudent ? 'Adding…' : 'Add'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddStudent(false); setNewStudentName(''); }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

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
                          <input type="checkbox" checked={a.attended} onChange={() => toggleAttendee(a.student_id)} />
                        </td>
                        <td style={{ fontWeight: 500, fontSize: 'var(--font-sm)' }}>{a.name}</td>
                        <td>
                          <input type="number" className="form-input"
                            style={{ height: 28, padding: '2px 4px', fontSize: 'var(--font-xs)' }}
                            value={a.quiz_score}
                            onChange={e => updateAttendee(a.student_id, FIELDS.QUIZ_SCORE, e.target.value)}
                            disabled={!a.attended} />
                        </td>
                        <td>
                          <input type="text" className="form-input"
                            style={{ height: 28, padding: '2px 4px', fontSize: 'var(--font-xs)' }}
                            value={a.student_feedback}
                            onChange={e => updateAttendee(a.student_id, FIELDS.STUDENT_FEEDBACK, e.target.value)}
                            disabled={!a.attended} />
                        </td>
                      </tr>
                    ))}
                    {attendees.length === 0 && (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>No students yet. Add one above.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Speaker Feedback</label>
              <textarea className="form-textarea" value={speakerFeedback} onChange={e => setSpeakerFeedback(e.target.value)} rows={2} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}><ChevronLeft size={16} /> Back</button>
              <button className="btn btn-primary" onClick={() => setStep(4)}>Next <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div>
            <div style={{ display: 'grid', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-sm)' }}>
              <div style={{ padding: 'var(--space-2)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>Topic</p>
                <p style={{ fontWeight: 600 }}>{eventType?.label}{eventType?.isNew && <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-accent)', marginLeft: 6 }}>(new)</span>}</p>
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
              <button className="btn btn-secondary" onClick={() => setStep(3)}><ChevronLeft size={16} /> Back</button>
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
