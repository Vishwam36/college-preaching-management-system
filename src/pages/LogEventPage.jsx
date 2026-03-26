import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { CalendarPlus } from 'lucide-react';
import EventForm from '../components/EventForm';

export default function LogEventPage() {
  const { selectedCollege, selectedYear } = useApp();
  const [key, setKey] = useState(0); // Used to reset the form

  if (!selectedCollege || !selectedYear) {
    return (
      <div className="empty-state">
        <CalendarPlus size={48} />
        <h3>Select College & Year</h3>
        <p>Please select a college and academic year from the header to log an event.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Log Event</h2>

      <div className="card" style={{ maxWidth: 800 }}>
        <EventForm 
          key={key}
          onSuccess={() => setKey(prev => prev + 1)} 
        />
      </div>
    </div>
  );
}
