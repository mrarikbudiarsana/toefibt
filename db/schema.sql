-- ============================================================
-- TOEFL iBT Platform — Supabase Schema
-- Run in: Supabase SQL Editor (new project)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- STUDENT PROFILES
-- (extends auth.users)
-- ============================================================
create table if not exists student_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.student_profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- TESTS
-- ============================================================
create table if not exists tests (
  id             uuid primary key default uuid_generate_v4(),
  title          text not null,
  section_order  text[] default array['reading','listening','writing','speaking'],
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ============================================================
-- TEST SECTIONS
-- ============================================================
create table if not exists test_sections (
  id                  uuid primary key default uuid_generate_v4(),
  test_id             uuid references tests(id) on delete cascade,
  section_type        text not null check (section_type in ('reading','listening','writing','speaking')),
  has_mst             boolean default false,
  module1_threshold   integer default 13,
  order_index         integer default 0,
  reading_passage     text,  -- shared passage text for reading questions
  created_at          timestamptz default now()
);

create index if not exists idx_test_sections_test_id on test_sections(test_id);

-- ============================================================
-- TEST QUESTIONS
-- ============================================================
create table if not exists test_questions (
  id                uuid primary key default uuid_generate_v4(),
  section_id        uuid references test_sections(id) on delete cascade,

  -- MST module assignment
  module            text not null default 'module1'
                    check (module in ('module1','module2_easy','module2_hard','module2_both')),

  -- Task type (all 12 iBT task types)
  task_type         text not null check (task_type in (
                      'c_test',
                      'read_daily_life',
                      'read_academic',
                      'listen_choose_response',
                      'listen_conversation',
                      'listen_announcement',
                      'listen_academic_talk',
                      'build_sentence',
                      'write_email',
                      'write_discussion',
                      'listen_repeat',
                      'take_interview'
                    )),

  -- Scoring
  is_scored         boolean default true,  -- false = invisible ghost question

  -- Content
  prompt            text,
  options           jsonb,          -- ["Option A", "Option B", "Option C", "Option D"]
  correct_answer    text,           -- "A", "B", "C", or "D" (null for writing/speaking)
  blanks_data       jsonb,          -- c_test: [{id, position, blank_length, answer}]
  tiles_data        jsonb,          -- build_sentence: ["The", "students", "are", ...]

  -- Media
  audio_url         text,           -- question-level audio
  speaker_photo_url text,           -- listening speaker or interview photo
  group_audio_url   text,           -- shared audio for conversation/talk groups
  group_id          text,           -- groups questions under same audio passage

  order_index       integer default 0,
  created_at        timestamptz default now()
);

alter table test_questions
  drop constraint if exists test_questions_module_check;

alter table test_questions
  add constraint test_questions_module_check
  check (module in ('module1','module2_easy','module2_hard','module2_both'));

create index if not exists idx_test_questions_section_id on test_questions(section_id);
create index if not exists idx_test_questions_module on test_questions(module);

-- ============================================================
-- TEST ASSIGNMENTS
-- ============================================================
create table if not exists test_assignments (
  id              uuid primary key default uuid_generate_v4(),
  test_id         uuid references tests(id) on delete cascade,
  student_id      uuid references auth.users(id) on delete cascade,
  available_from  timestamptz,
  due_at          timestamptz,
  created_at      timestamptz default now()
);

create index if not exists idx_test_assignments_student on test_assignments(student_id);
create unique index if not exists idx_test_assignments_unique on test_assignments(test_id, student_id);

-- ============================================================
-- TEST SUBMISSIONS
-- ============================================================
create table if not exists test_submissions (
  id                      uuid primary key default uuid_generate_v4(),
  assignment_id           uuid references test_assignments(id) on delete cascade,
  student_id              uuid references auth.users(id) on delete cascade,
  status                  text default 'in_progress'
                          check (status in ('in_progress','submitted','graded')),

  -- Student answers
  answers_json            jsonb default '{}',     -- {questionId: "A"} for MCQ/c_test
  writing_responses       jsonb default '{}',     -- {questionId: "essay text"}
  speaking_recording_urls jsonb default '{}',     -- {questionId: "https://..."}

  -- MST routing decisions
  mst_path                jsonb default '{}',     -- {reading: "hard", listening: "easy"}

  -- Scores
  raw_scores              jsonb default '{}',     -- {reading: {raw: 28, total: 35}}
  band_scores             jsonb default '{}',     -- {reading: 4, listening: 3, writing: 5, speaking: 4}
  cefr_levels             jsonb default '{}',     -- {reading: "B2", listening: "B1", ...}
  ai_scores               jsonb default '{}',     -- {questionId: {score: 4, feedback: "..."}}

  -- Grading
  grade_released          boolean default false,

  submitted_at            timestamptz,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

create index if not exists idx_submissions_assignment on test_submissions(assignment_id);
create index if not exists idx_submissions_student on test_submissions(student_id);
create index if not exists idx_submissions_status on test_submissions(status);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table student_profiles enable row level security;
alter table tests enable row level security;
alter table test_sections enable row level security;
alter table test_questions enable row level security;
alter table test_assignments enable row level security;
alter table test_submissions enable row level security;

-- Helper: check if current user is admin
create or replace function is_admin()
returns boolean language sql security definer as $$
  select coalesce(
    (auth.jwt()->'user_metadata'->>'role') = 'admin',
    false
  );
$$;

-- student_profiles: users can see/edit own profile; admins see all
drop policy if exists "Own profile" on student_profiles;
create policy "Own profile" on student_profiles for all
  using (auth.uid() = id or is_admin());

-- tests: admins manage; students can read
drop policy if exists "tests_admin_manage" on tests;
create policy "tests_admin_manage" on tests for all
  using (is_admin());
drop policy if exists "tests_students_read" on tests;
create policy "tests_students_read" on tests for select
  using (auth.uid() is not null);

-- test_sections: same as tests
drop policy if exists "sections_admin_manage" on test_sections;
create policy "sections_admin_manage" on test_sections for all
  using (is_admin());
drop policy if exists "sections_students_read" on test_sections;
create policy "sections_students_read" on test_sections for select
  using (auth.uid() is not null);

-- test_questions: same
drop policy if exists "questions_admin_manage" on test_questions;
create policy "questions_admin_manage" on test_questions for all
  using (is_admin());
drop policy if exists "questions_students_read" on test_questions;
create policy "questions_students_read" on test_questions for select
  using (auth.uid() is not null);

-- test_assignments: admins manage; students can see own
drop policy if exists "assignments_admin_manage" on test_assignments;
create policy "assignments_admin_manage" on test_assignments for all
  using (is_admin());
drop policy if exists "assignments_student_own" on test_assignments;
create policy "assignments_student_own" on test_assignments for select
  using (auth.uid() = student_id);

-- test_submissions: admins see all; students see own
drop policy if exists "submissions_admin_manage" on test_submissions;
create policy "submissions_admin_manage" on test_submissions for all
  using (is_admin());
drop policy if exists "submissions_student_own" on test_submissions;
create policy "submissions_student_own" on test_submissions for select
  using (auth.uid() = student_id);
drop policy if exists "submissions_student_insert" on test_submissions;
create policy "submissions_student_insert" on test_submissions for insert
  with check (auth.uid() = student_id);
drop policy if exists "submissions_student_update" on test_submissions;
create policy "submissions_student_update" on test_submissions for update
  using (auth.uid() = student_id);

-- ============================================================
-- SUPABASE STORAGE — Speaking recordings bucket
-- Run in Supabase Dashboard > Storage > Create bucket "recordings"
-- Or run this in the SQL editor:
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('recordings', 'recordings', true);
--
-- create policy "Anyone can upload recordings" on storage.objects
--   for insert with check (bucket_id = 'recordings' and auth.uid() is not null);
--
-- create policy "Recordings are publicly readable" on storage.objects
--   for select using (bucket_id = 'recordings');
