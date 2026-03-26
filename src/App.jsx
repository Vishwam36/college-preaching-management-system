import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LogEventPage from './pages/LogEventPage';
import EventHistoryPage from './pages/EventHistoryPage';
import StudentBoardPage from './pages/StudentBoardPage';
import StudentProfilePage from './pages/StudentProfilePage';
import ManagePage from './pages/ManagePage';
import BooksPage from './pages/BooksPage';

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }
  return session ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="*" element={
        <ProtectedRoute>
          <AppProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/log-event" element={<LogEventPage />} />
                <Route path="/events" element={<EventHistoryPage />} />
                <Route path="/students" element={<StudentBoardPage />} />
                <Route path="/students/:id" element={<StudentProfilePage />} />
                <Route path="/manage" element={<ManagePage />} />
                <Route path="/books" element={<BooksPage />} />
              </Routes>
            </Layout>
          </AppProvider>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
