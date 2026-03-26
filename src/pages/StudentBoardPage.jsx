import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { Users, Search } from 'lucide-react';

export default function StudentBoardPage() {
  const { selectedCollege } = useApp();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchStudents();
    fetchRatings();
  }, [selectedCollege]);

  async function fetchStudents() {
    setLoading(true);
    let query = supabase.from('students').select('*, colleges(name)').order('name');
    if (selectedCollege) query = query.eq('college_id', selectedCollege);
    const { data } = await query;
    setStudents(data || []);
    setLoading(false);
  }

  async function fetchRatings() {
    let query = supabase.from('student_ratings').select('student_id, rating');
    if (selectedCollege) query = query.eq('college_id', selectedCollege);
    const { data } = await query;
    const map = {};
    (data || []).forEach(r => { map[r.student_id] = r.rating; });
    setRatings(map);
  }

  const filtered = students.filter(s => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return <div className="page-loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Student Board</h2>

      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Search students…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            id="student-search"
          />
        </div>
        <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} id="status-filter">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="intermittent">Intermittent</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <h3>No students found</h3>
          <p>Add students in the Manage section or adjust your filters.</p>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>College</th>
                <th>Status</th>
                <th>Rating</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="clickable" onClick={() => navigate(`/students/${s.id}`)}>
                  <td style={{ fontWeight: 600, color: 'var(--text-accent)' }}>{s.name}</td>
                  <td>{s.colleges?.name}</td>
                  <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
                  <td>{ratings[s.id] != null ? ratings[s.id] : '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{s.phone || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
