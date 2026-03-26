import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { Users, CalendarDays, TrendingUp, BookOpen } from 'lucide-react';

export default function DashboardPage() {
  const { selectedCollege, selectedYear } = useApp();
  const [stats, setStats] = useState({ students: 0, events: 0, avgRating: 0, books: 0 });
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [selectedCollege, selectedYear]);

  async function fetchStats() {
    setLoading(true);

    // Count students
    let studentsQuery = supabase.from('students').select('id', { count: 'exact', head: true });
    if (selectedCollege) studentsQuery = studentsQuery.eq('college_id', selectedCollege);
    const { count: studentCount } = await studentsQuery;

    // Count events
    let eventsQuery = supabase.from('events').select('id', { count: 'exact', head: true });
    if (selectedCollege) eventsQuery = eventsQuery.eq('college_id', selectedCollege);
    if (selectedYear) eventsQuery = eventsQuery.eq('academic_year_id', selectedYear);
    const { count: eventCount } = await eventsQuery;

    // Avg rating
    let ratingsQuery = supabase.from('student_ratings').select('rating');
    if (selectedCollege) ratingsQuery = ratingsQuery.eq('college_id', selectedCollege);
    const { data: ratingsData } = await ratingsQuery;
    const avgRating = ratingsData?.length
      ? (ratingsData.reduce((s, r) => s + Number(r.rating), 0) / ratingsData.length).toFixed(1)
      : 0;

    // Count books read
    let booksQuery = supabase.from('student_books').select('id', { count: 'exact', head: true });
    const { count: booksCount } = await booksQuery;

    setStats({
      students: studentCount || 0,
      events: eventCount || 0,
      avgRating,
      books: booksCount || 0,
    });

    // Recent events
    let recentQuery = supabase
      .from('events')
      .select('*, event_types(name), colleges(name)')
      .order('event_date', { ascending: false })
      .limit(5);
    if (selectedCollege) recentQuery = recentQuery.eq('college_id', selectedCollege);
    if (selectedYear) recentQuery = recentQuery.eq('academic_year_id', selectedYear);
    const { data: recentData } = await recentQuery;
    setRecentEvents(recentData || []);

    setLoading(false);
  }

  if (loading) {
    return <div className="page-loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Dashboard</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon amber"><Users size={20} /></div>
          <h3>{stats.students}</h3>
          <p>Total Students</p>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon blue"><CalendarDays size={20} /></div>
          <h3>{stats.events}</h3>
          <p>Events Conducted</p>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green"><TrendingUp size={20} /></div>
          <h3>{stats.avgRating}</h3>
          <p>Avg Student Rating</p>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon red"><BookOpen size={20} /></div>
          <h3>{stats.books}</h3>
          <p>Books Read</p>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Recent Events</h3>
        {recentEvents.length === 0 ? (
          <div className="empty-state">
            <CalendarDays size={40} />
            <h3>No events yet</h3>
            <p>Log your first event to see it here.</p>
          </div>
        ) : (
          <div className="data-table-wrapper" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event Type</th>
                  <th>College</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map(event => (
                  <tr key={event.id}>
                    <td>{new Date(event.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td style={{ color: 'var(--text-accent)', fontWeight: 500 }}>{event.event_types?.name}</td>
                    <td>{event.colleges?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
