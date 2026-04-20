import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TABLES, FIELDS } from '../constants';

const AppContext = createContext(null);

const LS_COLLEGE = 'cpms_selected_college';
const LS_YEAR    = 'cpms_selected_year';

export function AppProvider({ children }) {
  const [colleges, setColleges] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedCollege, _setSelectedCollege] = useState(localStorage.getItem(LS_COLLEGE) || '');
  const [selectedYear,    _setSelectedYear]    = useState(localStorage.getItem(LS_YEAR)    || '');

  function setSelectedCollege(val) {
    _setSelectedCollege(val);
    if (val) localStorage.setItem(LS_COLLEGE, val);
    else     localStorage.removeItem(LS_COLLEGE);
  }

  function setSelectedYear(val) {
    _setSelectedYear(val);
    if (val) localStorage.setItem(LS_YEAR, val);
    else     localStorage.removeItem(LS_YEAR);
  }

  useEffect(() => {
    fetchColleges();
    fetchAcademicYears();
  }, []);

  async function fetchColleges() {
    const { data } = await supabase.from(TABLES.COLLEGES).select('*').order(FIELDS.NAME);
    setColleges(data || []);
    if (data?.length) {
      const saved = localStorage.getItem(LS_COLLEGE);
      const stillExists = saved && data.some(c => c.id === saved);
      if (!stillExists) _setSelectedCollege(data[0].id);
    }
  }

  async function fetchAcademicYears() {
    const { data } = await supabase.from(TABLES.ACADEMIC_YEARS).select('*').order(FIELDS.START_DATE, { ascending: false });
    setAcademicYears(data || []);
    if (data?.length) {
      const saved = localStorage.getItem(LS_YEAR);
      const stillExists = saved && data.some(y => y.id === saved);
      if (!stillExists) _setSelectedYear(data[0].id);
    }
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
