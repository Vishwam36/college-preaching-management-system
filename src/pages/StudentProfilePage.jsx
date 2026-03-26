import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, BookOpen, Star, TrendingUp } from 'lucide-react';

export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [rating, setRating] = useState(null);
  const [events, setEvents] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('events');

  useEffect(() => {
    fetchStudent();
    fetchEvents();
    fetchBooks();
    fetchRating();
  }, [id]);

  async function fetchStudent() {
    setLoading(true);
    const { data } = await supabase.from('students').select('*, colleges(name), academic_years:enrollment_year(label)').eq('id', id).single();
    setStudent(data);
    setLoading(false);
  }

  async function fetchRating() {
    const { data } = await supabase.from('student_ratings').select('*').eq('student_id', id).single();
    setRating(data);
  }

  async function fetchEvents() {
    const { data } = await supabase
      .from('event_attendance')
      .select('*, events(event_date, event_types(name), speaker_feedback)')
      .eq('student_id', id)
      .order('created_at', { ascending: false });
    setEvents(data || []);
  }

  async function fetchBooks() {
    const { data } = await supabase
      .from('student_books')
      .select('*, books(title, category)')
      .eq('student_id', id)
      .order('date_completed', { ascending: false });
    setBooks(data || []);
  }

  if (loading || !student) {
    return <div className="page-loading"><div className="spinner"></div></div>;
  }

  const initials = student.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div>
      <button className="btn btn-ghost" onClick={() => navigate('/students')} style={{ marginBottom: 'var(--space-4)' }}>
        <ArrowLeft size={16} /> Back to Students
      </button>

      <div className="profile-header">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-info">
          <h2>{student.name}</h2>
          <span className={`badge badge-${student.status}`} style={{ marginBottom: 'var(--space-2)', display: 'inline-flex' }}>{student.status}</span>
          <div className="profile-meta">
            {student.email && <span><Mail size={13} /> {student.email}</span>}
            {student.phone && <span><Phone size={13} /> {student.phone}</span>}
            {student.home_address && <span><MapPin size={13} /> {student.home_address}</span>}
            {student.dob && <span><Calendar size={13} /> DOB: {new Date(student.dob).toLocaleDateString('en-IN')}</span>}
            <span>College: {student.colleges?.name}</span>
            {student.academic_years?.label && <span>Enrolled: {student.academic_years.label}</span>}
          </div>
        </div>
      </div>

      <div className="profile-stats">
        <div className="stat-card">
          <div className="stat-card-icon green"><TrendingUp size={18} /></div>
          <h3>{rating?.rating ?? '—'}</h3>
          <p>Rating (out of 10)</p>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon blue"><Star size={18} /></div>
          <h3>{events.length}</h3>
          <p>Events Attended</p>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon amber"><BookOpen size={18} /></div>
          <h3>{books.length}</h3>
          <p>Books Read</p>
        </div>
      </div>

      {student.mentor_feedback && (
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Mentor Feedback</h3>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>{student.mentor_feedback}</p>
        </div>
      )}

      <div className="tabs">
        <button className={`tab ${tab === 'events' ? 'active' : ''}`} onClick={() => setTab('events')}>Events ({events.length})</button>
        <button className={`tab ${tab === 'books' ? 'active' : ''}`} onClick={() => setTab('books')}>Books ({books.length})</button>
      </div>

      {tab === 'events' && (
        events.length === 0 ? (
          <div className="empty-state"><p>No events attended yet.</p></div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event</th>
                  <th>Quiz Score</th>
                  <th>Feedback</th>
                </tr>
              </thead>
              <tbody>
                {events.map(e => (
                  <tr key={e.id}>
                    <td>{new Date(e.events?.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td style={{ color: 'var(--text-accent)', fontWeight: 500 }}>{e.events?.event_types?.name}</td>
                    <td>{e.quiz_score != null ? e.quiz_score : '—'}</td>
                    <td style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.student_feedback || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'books' && (
        books.length === 0 ? (
          <div className="empty-state"><p>No books recorded yet.</p></div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Category</th>
                  <th>Date Completed</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {books.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 500 }}>{b.books?.title}</td>
                    <td><span className={`badge badge-${b.books?.category}`}>{b.books?.category}</span></td>
                    <td>{b.date_completed ? new Date(b.date_completed).toLocaleDateString('en-IN') : '—'}</td>
                    <td style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>{b.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
