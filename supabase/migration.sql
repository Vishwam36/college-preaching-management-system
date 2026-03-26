-- ============================================================
-- College Preaching Management System — Full Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Academic Years
CREATE TABLE academic_years (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label       VARCHAR(20) NOT NULL UNIQUE,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Colleges
CREATE TABLE colleges (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    city        VARCHAR(100),
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. Speakers (dashboard users)
CREATE TABLE speakers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id  UUID UNIQUE REFERENCES auth.users(id),
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(200) UNIQUE NOT NULL,
    phone         VARCHAR(20),
    is_admin      BOOLEAN DEFAULT false,
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- 4. College ↔ Speaker assignments (per academic year)
CREATE TABLE college_speakers (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id       UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    speaker_id       UUID NOT NULL REFERENCES speakers(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id),
    created_at       TIMESTAMPTZ DEFAULT now(),
    UNIQUE(college_id, speaker_id, academic_year_id)
);

-- 5. Students
CREATE TABLE students (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    dob             DATE,
    email           VARCHAR(200),
    phone           VARCHAR(20),
    home_address    TEXT,
    college_id      UUID NOT NULL REFERENCES colleges(id),
    enrollment_year UUID REFERENCES academic_years(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'intermittent', 'inactive')),
    mentor_feedback TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- 6. Event Types (= topics)
CREATE TABLE event_types (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name    VARCHAR(100) NOT NULL UNIQUE
);

-- 7. Events
CREATE TABLE events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id          UUID NOT NULL REFERENCES colleges(id),
    academic_year_id    UUID NOT NULL REFERENCES academic_years(id),
    event_type_id       UUID NOT NULL REFERENCES event_types(id),
    event_date          DATE NOT NULL,
    speaker_feedback    TEXT,
    created_at          TIMESTAMPTZ DEFAULT now()
);

-- 8. Event ↔ Speaker (who spoke at each event)
CREATE TABLE event_speakers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    speaker_id  UUID NOT NULL REFERENCES speakers(id),
    UNIQUE(event_id, speaker_id)
);

-- 9. Event Attendance (per-student per-event)
CREATE TABLE event_attendance (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id         UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    student_id       UUID NOT NULL REFERENCES students(id),
    quiz_score       NUMERIC(5,2),
    student_feedback TEXT,
    created_at       TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, student_id)
);

-- 10. Books
CREATE TABLE books (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title     VARCHAR(300) NOT NULL,
    category  VARCHAR(10) NOT NULL CHECK (category IN ('small', 'medium', 'big'))
);

-- 11. Student ↔ Books
CREATE TABLE student_books (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    book_id         UUID NOT NULL REFERENCES books(id),
    date_completed  DATE,
    notes           TEXT,
    UNIQUE(student_id, book_id)
);

-- ============================================================
-- VIEW: student_ratings (auto-calculated rating 0–10)
-- Formula: (((attended/total) + (sum_quiz_pct * 0.01)) / (1 + #quizzes)) * 10
-- ============================================================
CREATE OR REPLACE VIEW student_ratings AS
SELECT
    s.id AS student_id,
    s.name,
    s.college_id,
    COALESCE(att.attended_sessions, 0) AS attended_sessions,
    COALESCE(tot.total_sessions, 0) AS total_sessions,
    COALESCE(att.num_quizzes, 0) AS num_quizzes,
    COALESCE(att.sum_quiz_pct, 0) AS sum_quiz_pct,
    CASE
        WHEN COALESCE(tot.total_sessions, 0) = 0 THEN 0
        ELSE ROUND(
            (
                (COALESCE(att.attended_sessions, 0)::NUMERIC / tot.total_sessions)
                + (COALESCE(att.sum_quiz_pct, 0) * 0.01)
            ) / (1 + COALESCE(att.num_quizzes, 0)) * 10
        , 1)
    END AS rating
FROM students s
LEFT JOIN (
    SELECT
        ea.student_id,
        COUNT(*)::NUMERIC AS attended_sessions,
        COUNT(ea.quiz_score) AS num_quizzes,
        COALESCE(SUM(ea.quiz_score), 0) AS sum_quiz_pct
    FROM event_attendance ea
    GROUP BY ea.student_id
) att ON att.student_id = s.id
LEFT JOIN (
    SELECT
        college_id,
        COUNT(*)::NUMERIC AS total_sessions
    FROM events
    GROUP BY college_id
) tot ON tot.college_id = s.college_id;

-- ============================================================
-- Row-Level Security (enable after setting up auth)
-- ============================================================
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_books ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read everything (simple policy)
-- You can tighten this per-college later
CREATE POLICY "Authenticated users can read" ON academic_years FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read" ON colleges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read" ON speakers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read" ON students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read" ON events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read" ON event_attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read" ON event_speakers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read" ON college_speakers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read" ON event_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read" ON books FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read" ON student_books FOR SELECT TO authenticated USING (true);

-- Allow all authenticated users to insert/update/delete (simple policy for now)
CREATE POLICY "Authenticated users can insert" ON academic_years FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON colleges FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON speakers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON students FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON event_attendance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON event_speakers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON college_speakers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON event_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON books FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON student_books FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update" ON academic_years FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON colleges FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON speakers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON students FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON event_attendance FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON event_speakers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON college_speakers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON event_types FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON books FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON student_books FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete" ON academic_years FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON colleges FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON speakers FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON students FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON events FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON event_attendance FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON event_speakers FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON college_speakers FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON event_types FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON books FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON student_books FOR DELETE TO authenticated USING (true);
