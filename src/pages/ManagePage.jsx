import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { Plus, Pencil, Trash2, X, Settings } from 'lucide-react';

/* ============================================================
   Generic CRUD section component
   ============================================================ */
function CrudSection({ title, items, columns, onAdd, onEdit, onDelete, renderForm, formData, setFormData, editId, setEditId, initialData = {} }) {
  const [showForm, setShowForm] = useState(false);

  function openAdd() {
    setEditId(null);
    setFormData({ ...initialData });
    setShowForm(true);
  }

  function openEdit(item) {
    setEditId(item.id);
    setFormData({ ...item });
    setShowForm(true);
  }

  function handleSave() {
    if (editId) onEdit(editId, formData);
    else onAdd(formData);
    setShowForm(false);
    setFormData({});
    setEditId(null);
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
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editId ? 'Edit' : 'Add'} {title.replace(/s$/, '')}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {renderForm()}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
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
    const { data } = await supabase.from('speakers').select('*').order('name');
    setSpeakers(data || []);
  }

  async function fetchStudents() {
    const { data } = await supabase.from('students').select('*, colleges(name)').order('name');
    setStudents(data || []);
  }

  async function fetchEventTypes() {
    const { data } = await supabase.from('event_types').select('*').order('name');
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
            { key: 'name', label: 'Name' },
            { key: 'city', label: 'City' },
          ]}
          onAdd={(d) => addItem('colleges', d, refreshColleges)}
          onEdit={(id, d) => editItem('colleges', id, d, refreshColleges)}
          onDelete={(id) => deleteItem('colleges', id, refreshColleges)}
          formData={formData} setFormData={setFormData} editId={editId} setEditId={setEditId}
          renderForm={() => (
            <>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={formData.name || ''} onChange={e => updateField('name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={formData.city || ''} onChange={e => updateField('city', e.target.value)} />
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
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
          ]}
          onAdd={(d) => addItem('speakers', d, fetchSpeakers)}
          onEdit={(id, d) => editItem('speakers', id, d, fetchSpeakers)}
          onDelete={(id) => deleteItem('speakers', id, fetchSpeakers)}
          formData={formData} setFormData={setFormData} editId={editId} setEditId={setEditId}
          renderForm={() => (
            <>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={formData.name || ''} onChange={e => updateField('name', e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={formData.email || ''} onChange={e => updateField('email', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={formData.phone || ''} onChange={e => updateField('phone', e.target.value)} />
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
          initialData={{ college_id: selectedCollege, enrollment_year: selectedYear }}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'college', label: 'College', render: s => s.colleges?.name },
            { key: 'status', label: 'Status', render: s => <span className={`badge badge-${s.status}`}>{s.status}</span> },
            { key: 'phone', label: 'Phone' },
          ]}
          onAdd={(d) => addItem('students', d, fetchStudents)}
          onEdit={(id, d) => editItem('students', id, d, fetchStudents)}
          onDelete={(id) => deleteItem('students', id, fetchStudents)}
          formData={formData} setFormData={setFormData} editId={editId} setEditId={setEditId}
          renderForm={() => (
            <>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={formData.name || ''} onChange={e => updateField('name', e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">DOB</label>
                  <input className="form-input" type="date" value={formData.dob || ''} onChange={e => updateField('dob', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={formData.status || 'active'} onChange={e => updateField('status', e.target.value)}>
                    <option value="active">Active</option>
                    <option value="intermittent">Intermittent</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={formData.email || ''} onChange={e => updateField('email', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={formData.phone || ''} onChange={e => updateField('phone', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Home Address</label>
                <textarea className="form-textarea" value={formData.home_address || ''} onChange={e => updateField('home_address', e.target.value)} rows={2} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">College</label>
                  <select className="form-select" value={formData.college_id || ''} onChange={e => updateField('college_id', e.target.value)}>
                    <option value="">Select college…</option>
                    {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Enrollment Year</label>
                  <select className="form-select" value={formData.enrollment_year || ''} onChange={e => updateField('enrollment_year', e.target.value)}>
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
            { key: 'name', label: 'Name' },
          ]}
          onAdd={(d) => addItem('event_types', d, fetchEventTypes)}
          onEdit={(id, d) => editItem('event_types', id, d, fetchEventTypes)}
          onDelete={(id) => deleteItem('event_types', id, fetchEventTypes)}
          formData={formData} setFormData={setFormData} editId={editId} setEditId={setEditId}
          renderForm={() => (
            <div className="form-group">
              <label className="form-label">Event Type Name</label>
              <input className="form-input" value={formData.name || ''} onChange={e => updateField('name', e.target.value)} placeholder="e.g. Weekly Session, Retreat" />
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
            { key: 'label', label: 'Label' },
            { key: 'start_date', label: 'Start', render: y => y.start_date },
            { key: 'end_date', label: 'End', render: y => y.end_date },
          ]}
          onAdd={(d) => addItem('academic_years', d, refreshAcademicYears)}
          onEdit={(id, d) => editItem('academic_years', id, d, refreshAcademicYears)}
          onDelete={(id) => deleteItem('academic_years', id, refreshAcademicYears)}
          formData={formData} setFormData={setFormData} editId={editId} setEditId={setEditId}
          renderForm={() => (
            <>
              <div className="form-group">
                <label className="form-label">Label (e.g. 2025-26)</label>
                <input className="form-input" value={formData.label || ''} onChange={e => updateField('label', e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-input" type="date" value={formData.start_date || ''} onChange={e => updateField('start_date', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input className="form-input" type="date" value={formData.end_date || ''} onChange={e => updateField('end_date', e.target.value)} />
                </div>
              </div>
            </>
          )}
        />
      )}
    </div>
  );
}
