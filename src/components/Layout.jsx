import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import {
  LayoutDashboard, CalendarPlus, History, Users, Settings,
  BookOpen, LogOut, GraduationCap, Menu, X
} from 'lucide-react';
import { useState } from 'react';

export default function Layout({ children }) {
  const { signOut, speaker } = useAuth();
  const { colleges, academicYears, selectedCollege, setSelectedCollege, selectedYear, setSelectedYear } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <GraduationCap size={20} />
          </div>
          <div>
            <h1>CPMS</h1>
            <span>Preaching Dashboard</span>
          </div>
          <button className="btn btn-ghost" onClick={() => setSidebarOpen(false)} style={{ marginLeft: 'auto', display: 'none' }} id="close-sidebar-btn">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Main</div>
          <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} end>
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          <NavLink to="/log-event" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <CalendarPlus size={18} /> Log Event
          </NavLink>
          <NavLink to="/events" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <History size={18} /> Event History
          </NavLink>
          <NavLink to="/students" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Users size={18} /> Student Board
          </NavLink>

          <div className="sidebar-section-title">Management</div>
          <NavLink to="/manage" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Settings size={18} /> Manage
          </NavLink>
          <NavLink to="/books" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <BookOpen size={18} /> Books
          </NavLink>
        </nav>

        <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border-primary)' }}>
          {speaker && (
            <div style={{ padding: 'var(--space-3)', marginBottom: 'var(--space-2)', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
              Signed in as <b style={{ color: 'var(--text-primary)' }}>{speaker.name}</b>
            </div>
          )}
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={signOut}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setSidebarOpen(true)} style={{ display: 'none' }} id="open-sidebar-btn">
              <Menu size={18} />
            </button>
          </div>
          <div className="page-header-actions">
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '160px' }}
              value={selectedCollege}
              onChange={(e) => setSelectedCollege(e.target.value)}
              id="college-selector"
            >
              <option value="">All Colleges</option>
              {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '140px' }}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              id="year-selector"
            >
              <option value="">All Years</option>
              {academicYears.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
            </select>
          </div>
        </div>
        <div className="page-body">
          {children}
        </div>
      </main>
    </div>
  );
}
