import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { Plus, Pencil, Trash2, X, Settings } from 'lucide-react';
import { TABLES, FIELDS } from '../constants';

/* ============================================================
   Generic CRUD section component
   ============================================================ */
function CrudSection({ title, items, columns, onAdd, onEdit, onDelete, renderForm, formData, setFormData, editId, setEditId, initialData = {}, requiredFields = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState([]);

  function openAdd() {
    setEditId(null);
    setFormData({ ...initialData });
    setErrors([]);
    setShowForm(true);
  }

  function openEdit(item) {
    setEditId(item.id);
    setFormData({ ...item });
    setErrors([]);
    setShowForm(true);
  }

  function handleSave() {
    const missing = requiredFields.filter(f => !formData[f] || formData[f].toString().trim() === '');
    if (missing.length > 0) {
      setErrors(missing);
      return;
    }

    if (editId) onEdit(editId, formData);
    else onAdd(formData);
    setShowForm(false);
    setFormData({});
    setEditId(null);
    setErrors([]);
  }

  function closeForm() {
    setShowForm(false);
    setErrors([]);
  }

  return (
    <div style={{ marginBottom: 'var(--space-8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>{title}</h3>
        <button className="btn btn-primary btn-sm" onClick={openAdd}><Plus size={14} /> Add</button>
      </div>

      {items.length > 0 ? (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map(c => <th key={c.key}>{c.label}</th>)}
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  {columns.map(c => <td key={c.key}>{c.render ? c.render(item) : item[c.key]}</td>)}
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}><Pencil size={13} /></button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => onDelete(item.id)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>No items yet. Click Add to create one.</p>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editId ? 'Edit' : 'Add'} {title.replace(/s$/, '')}</h3>
              <button className="btn btn-ghost btn-sm" onClick={closeForm}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {renderForm(errors)}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeForm}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Manage Page
   ============================================================ */
export default function ManagePage() {
  const { colleges, academicYears, refreshColleges, refreshAcademicYears, selectedCollege, selectedYear } = useApp();
  const [tab, setTab] = useState('colleges');

  // Data
  const [speakers, setSpeakers] = useState([]);
  const [students, setStudents] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);

  // Form state
  const [formData, setFormData] = useState({});
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchSpeakers();
    fetchStudents();
    fetchEventTypes();
  }, []);

  async function fetchSpeakers() {
    const { data } = await supabase.from(TABLES.SPEAKERS).select('*').order(FIELDS.NAME);
    setSpeakers(data || []);
  }

  async function fetchStudents() {
    const { data } = await supabase.from(TABLES.STUDENTS).select(`*, ${TABLES.COLLEGES}(${FIELDS.NAME})`).order(FIELDS.NAME);
    setStudents(data || []);
  }

  async function fetchEventTypes() {
    const { data } = await supabase.from(TABLES.EVENT_TYPES).select('*').order(FIELDS.NAME);
    setEventTypes(data || []);
  }

  // CRUD helpers
  async function addItem(table, data, refresh) {
    const clean = { ...data };
    delete clean.id;
    delete clean.created_at;
    delete clean.colleges;
    delete clean.academic_years;
    await supabase.from(table).insert(clean);
    refresh();
  }

  async function editItem(table, id, data, refresh) {
    const clean = { ...data };
    delete clean.id;
    delete clean.created_at;
    delete clean.colleges;
    delete clean.academic_years;
    await supabase.from(table).update(clean).eq('id', id);
    refresh();
  }

  async function deleteItem(table, id, refresh) {
    if (!confirm('Are you sure?')) return;
    await supabase.from(table).delete().eq('id', id);
    refresh();
  }

  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <div>
      <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Manage</h2>

      <div className="tabs">
        {['colleges', 'speakers', 'students', 'eventTypes', 'academicYears'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {{colleges: 'Colleges', speakers: 'Speakers', students: 'Students', eventTypes: 'Event Types', academicYears: 'Academic Years'}[t]}
          </button>
        ))}
      </div>

      {/* COLLEGES */}
      {tab === 'colleges' && (
        <CrudSection
          title="Colleges"
          items={colleges}
          columns={[
            { key: FIELDS.NAME, label: 'Name' },
            { key: FIELDS.CITY, label: 'City' },
          ]}
          onAdd={(d) => addItem(TABLES.COLLEGES, d, refreshColleges)}
          onEdit={(id, d) => editItem(TABLES.COLLEGES, id, d, refreshColleges)}
          onDelete={(id) => deleteItem(TABLES.COLLEGES, id, refreshColleges)}
          formData={formData} setFormData={setFormData} editId={editId} setEditId={setEditId}
          requiredFields={[FIELDS.NAME]}
          renderForm={(errors) => (
            <>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className={`form-input ${errors.includes(FIELDS.NAME) ? 'form-input-error' : ''}`} value={formData[FIELDS.NAME] || ''} onChange={e => updateField(FIELDS.NAME, e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={formData[FIELDS.CITY] || ''} onChange={e => updateField(FIELDS.CITY, e.target.value)} />
              </div>
            </>
          )}
        />
      )}

      {/* SPEAKERS */}
      {tab === 'speakers' && (
        <CrudSection
          title="Speakers"
          items={speakers}
          columns={[
            { key: FIELDS.NAME, label: 'Name' },
            { key: FIELDS.EMAIL, label: 'Email' },
            { key: FIELDS.PHONE, label: 'Phone' },
          ]}
          onAdd={(d) => addItem(TABLES.SPEAKERS, d, fetchSpeakers)}
          onEdit={(id, d) => editItem(TABLES.SPEAKERS, id, d, fetchSpeakers)}
          onDelete={(id) => deleteItem(TABLES.SPEAKERS, id, fetchSpeakers)}
          formData={formData} setFormData={setFormData} editId={editId} setEditId={setEditId}
          requiredFields={[FIELDS.NAME, FIELDS.EMAIL]}
          renderForm={(errors) => (
            <>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className={`form-input ${errors.includes(FIELDS.NAME) ? 'form-input-error' : ''}`} value={formData[FIELDS.NAME] || ''} onChange={e => updateField(FIELDS.NAME, e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className={`form-input ${errors.includes(FIELDS.EMAIL) ? 'form-input-error' : ''}`} type="email" value={formData[FIELDS.EMAIL] || ''} onChange={e => updateField(FIELDS.EMAIL, e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={formData[FIELDS.PHONE] || ''} onChange={e => updateField(FIELDS.PHONE, e.target.value)} />
                </div>
              </div>
            </>
          )}
        />
      )}

      {/* STUDENTS */}
      {tab === 'students' && (
        <CrudSection
          title="Students"
          items={students}
          initialData={{ [FIELDS.COLLEGE_ID]: selectedCollege, [FIELDS.ENROLLMENT_YEAR]: selectedYear }}
          columns={[
            { key: FIELDS.NAME, label: 'Name' },
            { key: 'college', label: 'College', render: s => s[TABLES.COLLEGES]?.name },
            { key: FIELDS.STATUS, label: 'Status', render: s => <span className={`badge badge-${s[FIELDS.STATUS]}`}>{s[FIELDS.STATUS]}</span> },
            { key: FIELDS.PHONE, label: 'Phone' },
          ]}
          onAdd={(d) => addItem(TABLES.STUDENTS, d, fetchStudents)}
          onEdit={(id, d) => editItem(TABLES.STUDENTS, id, d, fetchStudents)}
          onDelete={(id) => deleteItem(TABLES.STUDENTS, id, fetchStudents)}
          formData={formData} setFormData={setFormData} editId={editId} setEditId={setEditId}
          requiredFields={[FIELDS.NAME, FIELDS.COLLEGE_ID, FIELDS.STATUS]}
          renderForm={(errors) => (
            <>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className={`form-input ${errors.includes(FIELDS.NAME) ? 'form-input-error' : ''}`} value={formData[FIELDS.NAME] || ''} onChange={e => updateField(FIELDS.NAME, e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">DOB</label>
                  <input className="form-input" type="date" value={formData.dob || ''} onChange={e => updateField('dob', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className={`form-select ${errors.includes(FIELDS.STATUS) ? 'form-input-error' : ''}`} value={formData[FIELDS.STATUS] || 'active'} onChange={e => updateField(FIELDS.STATUS, e.target.value)}>
                    <option value="active">Active</option>
                    <option value="intermittent">Intermittent</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={formData[FIELDS.EMAIL] || ''} onChange={e => updateField(FIELDS.EMAIL, e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={formData[FIELDS.PHONE] || ''} onChange={e => updateField(FIELDS.PHONE, e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Home Address</label>
                <textarea className="form-textarea" value={formData.home_address || ''} onChange={e => updateField('home_address', e.target.value)} rows={2} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">College</label>
                  <select className={`form-select ${errors.includes(FIELDS.COLLEGE_ID) ? 'form-input-error' : ''}`} value={formData[FIELDS.COLLEGE_ID] || ''} onChange={e => updateField(FIELDS.COLLEGE_ID, e.target.value)}>
                    <option value="">Select college…</option>
                    {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Enrollment Year</label>
                  <select className="form-select" value={formData[FIELDS.ENROLLMENT_YEAR] || ''} onChange={e => updateField(FIELDS.ENROLLMENT_YEAR, e.target.value)}>
                    <option value="">Select year…</option>
                    {academicYears.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Mentor Feedback</label>
                <textarea className="form-textarea" value={formData.mentor_feedback || ''} onChange={e => updateField('mentor_feedback', e.target.value)} rows={2} />
              </div>
            </>
          )}
        />
      )}

      {/* EVENT TYPES */}
      {tab === 'eventTypes' && (
        <CrudSection
          title="Event Types"
          items={eventTypes}
          columns={[
            { key: FIELDS.NAME, label: 'Name' },
          ]}
          onAdd={(d) => addItem(TABLES.EVENT_TYPES, d, fetchEventTypes)}
          onEdit={(id, d) => editItem(TABLES.EVENT_TYPES, id, d, fetchEventTypes)}
          onDelete={(id) => deleteItem(TABLES.EVENT_TYPES, id, fetchEventTypes)}
          formData={formData} setFormData={setFormData} editId={editId} setEditId={setEditId}
          requiredFields={[FIELDS.NAME]}
          renderForm={(errors) => (
            <div className="form-group">
              <label className="form-label">Event Type Name</label>
              <input className={`form-input ${errors.includes(FIELDS.NAME) ? 'form-input-error' : ''}`} value={formData[FIELDS.NAME] || ''} onChange={e => updateField(FIELDS.NAME, e.target.value)} placeholder="e.g. Weekly Session, Retreat" />
            </div>
          )}
        />
      )}

      {/* ACADEMIC YEARS */}
      {tab === 'academicYears' && (
        <CrudSection
          title="Academic Years"
          items={academicYears}
          columns={[
            { key: FIELDS.LABEL, label: 'Label' },
            { key: FIELDS.START_DATE, label: 'Start', render: y => y[FIELDS.START_DATE] },
            { key: FIELDS.END_DATE, label: 'End', render: y => y[FIELDS.END_DATE] },
          ]}
          onAdd={(d) => addItem(TABLES.ACADEMIC_YEARS, d, refreshAcademicYears)}
          onEdit={(id, d) => editItem(TABLES.ACADEMIC_YEARS, id, d, refreshAcademicYears)}
          onDelete={(id) => deleteItem(TABLES.ACADEMIC_YEARS, id, refreshAcademicYears)}
          formData={formData} setFormData={setFormData} editId={editId} setEditId={setEditId}
          requiredFields={[FIELDS.LABEL, FIELDS.START_DATE, FIELDS.END_DATE]}
          renderForm={(errors) => (
            <>
              <div className="form-group">
                <label className="form-label">Label (e.g. 2025-26)</label>
                <input className={`form-input ${errors.includes(FIELDS.LABEL) ? 'form-input-error' : ''}`} value={formData[FIELDS.LABEL] || ''} onChange={e => updateField(FIELDS.LABEL, e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className={`form-input ${errors.includes(FIELDS.START_DATE) ? 'form-input-error' : ''}`} type="date" value={formData[FIELDS.START_DATE] || ''} onChange={e => updateField(FIELDS.START_DATE, e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input className={`form-input ${errors.includes(FIELDS.END_DATE) ? 'form-input-error' : ''}`} type="date" value={formData[FIELDS.END_DATE] || ''} onChange={e => updateField(FIELDS.END_DATE, e.target.value)} />
                </div>
              </div>
            </>
          )}
        />
      )}
    </div>
  );
}
