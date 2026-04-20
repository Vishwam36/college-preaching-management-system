// Table Names
export const TABLES = {
  COLLEGES: 'colleges',
  SPEAKERS: 'speakers',
  STUDENTS: 'students',
  EVENT_TYPES: 'event_types',
  ACADEMIC_YEARS: 'academic_years',
  EVENTS: 'events',
  EVENT_SPEAKERS: 'event_speakers',
  EVENT_ATTENDANCE: 'event_attendance',
  BOOKS: 'books',
  STUDENT_BOOKS: 'student_books',
};

// Field Names
export const FIELDS = {
  ID: 'id',
  NAME: 'name',
  EMAIL: 'email',
  PHONE: 'phone',
  CITY: 'city',
  STATUS: 'status',
  COLLEGE_ID: 'college_id',
  ENROLLMENT_YEAR: 'enrollment_year',
  LABEL: 'label',
  START_DATE: 'start_date',
  END_DATE: 'end_date',
  EVENT_TYPE_ID: 'event_type_id',
  EVENT_DATE: 'event_date',
  SPEAKER_FEEDBACK: 'speaker_feedback',
  STUDENT_ID: 'student_id',
  BOOK_ID: 'book_id',
  QUIZ_SCORE: 'quiz_score',
  STUDENT_FEEDBACK: 'student_feedback',
  ACADEMIC_YEAR_ID: 'academic_year_id'
};

// Form Field IDs (used in EventForm for validation error tracking)
export const FORM_FIELDS = {
  EVENT_TYPE: 'eventTypeId',
  EVENT_DATE: 'eventDate',
};
