import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BookOpen, Plus, X, Trash2, Pencil } from 'lucide-react';

export default function BooksPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', category: 'small' });
  const [editId, setEditId] = useState(null);

  // For assigning books to students
  const [students, setStudents] = useState([]);
  const [showAssign, setShowAssign] = useState(null); // book id
  const [assignData, setAssignData] = useState({ student_id: '', date_completed: '', notes: '' });

  useEffect(() => {
    fetchBooks();
    fetchStudents();
  }, []);

  async function fetchBooks() {
    setLoading(true);
    const { data } = await supabase.from('books').select('*').order('title');
    setBooks(data || []);
    setLoading(false);
  }

  async function fetchStudents() {
    const { data } = await supabase.from('students').select('id, name').order('name');
    setStudents(data || []);
  }

  async function handleSave() {
    const clean = { title: formData.title, category: formData.category };
    if (editId) {
      await supabase.from('books').update(clean).eq('id', editId);
    } else {
      await supabase.from('books').insert(clean);
    }
    setShowForm(false);
    setFormData({ title: '', category: 'small' });
    setEditId(null);
    fetchBooks();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this book?')) return;
    await supabase.from('books').delete().eq('id', id);
    fetchBooks();
  }

  async function handleAssign() {
    if (!assignData.student_id || !showAssign) return;
    await supabase.from('student_books').insert({
      student_id: assignData.student_id,
      book_id: showAssign,
      date_completed: assignData.date_completed || null,
      notes: assignData.notes || null,
    });
    setShowAssign(null);
    setAssignData({ student_id: '', date_completed: '', notes: '' });
  }

  if (loading) {
    return <div className="page-loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 700 }}>Books</h2>
        <button className="btn btn-primary" onClick={() => { setEditId(null); setFormData({ title: '', category: 'small' }); setShowForm(true); }}>
          <Plus size={16} /> Add Book
        </button>
      </div>

      {books.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={48} />
          <h3>No books yet</h3>
          <p>Add books to track student reading progress.</p>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th style={{ width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 500 }}>{b.title}</td>
                  <td><span className={`badge badge-${b.category}`}>{b.category}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setShowAssign(b.id)} title="Assign to student">
                        <Plus size={13} /> Assign
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditId(b.id); setFormData({ title: b.title, category: b.category }); setShowForm(true); }}>
                        <Pencil size={13} />
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(b.id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Book Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editId ? 'Edit' : 'Add'} Book</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="big">Big</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Book Modal */}
      {showAssign && (
        <div className="modal-overlay" onClick={() => setShowAssign(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Assign Book to Student</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAssign(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Student</label>
                <select className="form-select" value={assignData.student_id} onChange={e => setAssignData(p => ({ ...p, student_id: e.target.value }))}>
                  <option value="">Select student…</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date Completed</label>
                <input type="date" className="form-input" value={assignData.date_completed} onChange={e => setAssignData(p => ({ ...p, date_completed: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <textarea className="form-textarea" value={assignData.notes} onChange={e => setAssignData(p => ({ ...p, notes: e.target.value }))} rows={2} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAssign(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssign}>Assign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
