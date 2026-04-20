import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TABLES, FIELDS } from '../constants';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [colleges, setColleges] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedCollege, setSelectedCollege] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  useEffect(() => {
    fetchColleges();
    fetchAcademicYears();
  }, []);

  async function fetchColleges() {
    const { data } = await supabase.from(TABLES.COLLEGES).select('*').order(FIELDS.NAME);
    setColleges(data || []);
    if (data?.length && !selectedCollege) setSelectedCollege(data[0].id);
  }

  async function fetchAcademicYears() {
    const { data } = await supabase.from(TABLES.ACADEMIC_YEARS).select('*').order(FIELDS.START_DATE, { ascending: false });
    setAcademicYears(data || []);
    if (data?.length && !selectedYear) setSelectedYear(data[0].id);
  }

  return (
    <AppContext.Provider value={{
      colleges, academicYears,
      selectedCollege, setSelectedCollege,
      selectedYear, setSelectedYear,
      refreshColleges: fetchColleges,
      refreshAcademicYears: fetchAcademicYears,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
