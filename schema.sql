-- 사이°C 데이터베이스 구조. 배포 때 BAZE 가 이 파일을 그대로 적용한다(미리보기는 scripts/db-init.mjs).
-- 규칙: 이미 배포된 표는 지우거나 바꾸지 않고 CREATE ... IF NOT EXISTS / 새 표·새 칸 추가만 한다.
-- 관계와 칸 설명은 DATABASE.md. 외래 키는 D1 에서 항상 검사되며, 체험 모드(sandbox_id)는
-- schools·users 를 지우면 ON DELETE CASCADE 로 딸린 행이 함께 지워진다.

CREATE TABLE IF NOT EXISTS rate_limit (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);

-- 심사용 체험 공간. 심사위원 한 명이 「체험 시작」을 누를 때마다 하나씩 생기고 expires_at 이 지나면 지워진다.
CREATE TABLE IF NOT EXISTS demo_sandboxes (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('elementary', 'middle', 'high')),
  region TEXT NOT NULL DEFAULT '',
  district TEXT NOT NULL DEFAULT '',
  neis_office_code TEXT,             -- 추후 학교 공식 데이터(NEIS) 연동용: 시도교육청 코드
  neis_school_code TEXT,             -- 추후 NEIS 연동용: 행정표준코드
  source TEXT NOT NULL DEFAULT 'test' CHECK (source IN ('test', 'neis', 'demo')),
  sandbox_id TEXT REFERENCES demo_sandboxes(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS schools_neis ON schools(neis_school_code) WHERE neis_school_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS schools_name ON schools(name);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  name TEXT NOT NULL,
  email TEXT,                        -- 교사만
  login_id TEXT,                     -- 학생만
  password_hash TEXT,                -- pbkdf2$반복$소금$해시. 체험 계정은 비어 있어 로그인할 수 없다
  nickname TEXT,                     -- 랭킹에 보이는 이름(추후)
  school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,   -- 교사의 소속 학교
  teacher_status TEXT CHECK (teacher_status IN ('pending', 'verified', 'rejected')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  sandbox_id TEXT REFERENCES demo_sandboxes(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  last_login_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email ON users(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_login_id ON users(login_id) WHERE login_id IS NOT NULL;

-- 로그인 상태. id 는 쿠키 토큰의 SHA-256 이라 표를 읽어도 로그인할 수 없다.
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sandbox_id TEXT REFERENCES demo_sandboxes(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_year INTEGER NOT NULL,
  grade INTEGER NOT NULL,
  class_no INTEGER NOT NULL,
  name TEXT NOT NULL DEFAULT '',     -- 학급 별칭(선택)
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS classes_unique ON classes(school_id, school_year, grade, class_no) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS classes_teacher ON classes(teacher_id);

CREATE TABLE IF NOT EXISTS class_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_no INTEGER NOT NULL,       -- 출석번호
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'left')),
  requested_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  decided_at TEXT,
  decided_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (class_id, user_id)
);
CREATE INDEX IF NOT EXISTS class_members_user ON class_members(user_id);

CREATE TABLE IF NOT EXISTS class_invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS class_invites_class ON class_invites(class_id);

CREATE TABLE IF NOT EXISTS manitto_seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  starts_on TEXT NOT NULL,           -- YYYY-MM-DD
  ends_on TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended')),
  difficulty TEXT NOT NULL DEFAULT 'normal' CHECK (difficulty IN ('easy', 'normal', 'challenge')),
  base_reward INTEGER NOT NULL DEFAULT 10,
  special_reward INTEGER NOT NULL DEFAULT 20,
  personal_target_credits INTEGER NOT NULL DEFAULT 100,
  class_target_credits INTEGER,      -- 시즌 시작 때 참여 학생 수 × 개인 목표로 확정
  ranking_public INTEGER NOT NULL DEFAULT 1,
  daily_mission_limit INTEGER NOT NULL DEFAULT 2,
  reveal_on_end INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  started_at TEXT,
  ended_at TEXT
);
CREATE INDEX IF NOT EXISTS manitto_seasons_class ON manitto_seasons(class_id, status);

CREATE TABLE IF NOT EXISTS season_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL REFERENCES manitto_seasons(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ranking_opt_out INTEGER NOT NULL DEFAULT 0,
  reveal_consent INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (season_id, user_id)
);

-- 배정 제외 조건(담임 지정): 이 두 학생은 서로 마니또로 묶지 않는다.
CREATE TABLE IF NOT EXISTS manitto_exclusions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL REFERENCES manitto_seasons(id) ON DELETE CASCADE,
  user_a INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (season_id, user_a, user_b)
);

-- giver 가 receiver 를 몰래 챙긴다. 한 시즌에서 giver·receiver 는 각각 한 번씩만 나온다.
CREATE TABLE IF NOT EXISTS manitto_pairs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL REFERENCES manitto_seasons(id) ON DELETE CASCADE,
  giver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (season_id, giver_id),
  UNIQUE (season_id, receiver_id),
  CHECK (giver_id <> receiver_id)
);

CREATE TABLE IF NOT EXISTS missions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL REFERENCES manitto_seasons(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pair_id INTEGER REFERENCES manitto_pairs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'basic' CHECK (kind IN ('basic', 'special', 'teacher')),
  difficulty TEXT NOT NULL DEFAULT 'normal',
  reward_credits INTEGER NOT NULL DEFAULT 10,
  est_minutes INTEGER NOT NULL DEFAULT 5,
  source TEXT NOT NULL DEFAULT 'preset' CHECK (source IN ('ai', 'preset', 'teacher')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'submitted', 'approved', 'revise', 'skipped')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS missions_user ON missions(user_id, status);

CREATE TABLE IF NOT EXISTS mission_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id INTEGER NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  ai_summary TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revise')),
  teacher_comment TEXT,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS mission_submissions_status ON mission_submissions(status);

-- 크레딧의 유일한 원본. 개인·학급 온도와 랭킹은 모두 이 표의 합으로 계산한다.
-- submission_id UNIQUE 로 같은 제출에 두 번 지급되지 않는다.
CREATE TABLE IF NOT EXISTS credit_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  season_id INTEGER REFERENCES manitto_seasons(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('mission_basic', 'mission_special', 'teacher_award', 'demo_seed')),
  mission_id INTEGER REFERENCES missions(id) ON DELETE SET NULL,
  submission_id INTEGER UNIQUE REFERENCES mission_submissions(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS credit_season_user ON credit_transactions(season_id, user_id);
CREATE INDEX IF NOT EXISTS credit_user ON credit_transactions(user_id);

-- 하루 한 줄씩(그날 마지막 값) 남기는 온도 기록. subject = 'class' 또는 학생 id.
CREATE TABLE IF NOT EXISTS temperature_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  season_id INTEGER NOT NULL REFERENCES manitto_seasons(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  temperature REAL NOT NULL,
  credits INTEGER NOT NULL,
  recorded_on TEXT NOT NULL,         -- YYYY-MM-DD (한국 시간)
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (season_id, subject, recorded_on)
);

-- 비공개 화해 신호. 보낸 학생 본인만 읽는다. 교사·관리자 화면에는 어떤 경로로도 나가지 않는다.
CREATE TABLE IF NOT EXISTS reconciliation_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  from_user INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phrase_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'matched', 'expired')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  cancelled_at TEXT,
  CHECK (from_user <> to_user)
);
CREATE INDEX IF NOT EXISTS reconciliation_pair ON reconciliation_signals(from_user, to_user, status);

CREATE TABLE IF NOT EXISTS reconciliation_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_a INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- 작은 id
  user_b INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- 큰 id
  signal_a INTEGER REFERENCES reconciliation_signals(id) ON DELETE SET NULL,
  signal_b INTEGER REFERENCES reconciliation_signals(id) ON DELETE SET NULL,
  mediation_requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL CHECK (kind IN ('class', 'personal')),
  threshold INTEGER                  -- 학급 배지는 온도(°C)
);

CREATE TABLE IF NOT EXISTS user_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  season_id INTEGER REFERENCES manitto_seasons(id) ON DELETE CASCADE,
  awarded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (user_id, badge_id, season_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  link TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id, created_at);

CREATE TABLE IF NOT EXISTS user_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS counseling_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'general',
  message TEXT NOT NULL DEFAULT '',
  urgent INTEGER NOT NULL DEFAULT 0,  -- 학교폭력·위협: 화해보다 보호가 먼저
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT
);

-- 운영 기록: 누가 무엇을 했는지(가입 승인, 코드 재발급, 교사 인증 …). 화해 신호 내용은 남기지 않는다.
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT '',
  target_id TEXT NOT NULL DEFAULT '',
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  sandbox_id TEXT REFERENCES demo_sandboxes(id) ON DELETE CASCADE,
  meta TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS activity_logs_created ON activity_logs(created_at);

-- ── 기본 데이터 ────────────────────────────────────────────────────────────────
-- 학교 공식 데이터 연동 전까지 쓰는 테스트용 가상 학교. 화면에도 「테스트용」으로 표시한다.
INSERT OR IGNORE INTO schools (id, name, level, region, district, source) VALUES
  (1, '사이초등학교 (테스트용)', 'elementary', '서울특별시', '테스트구', 'test'),
  (2, '온새미초등학교 (테스트용)', 'elementary', '경기도', '테스트시', 'test'),
  (3, '사이중학교 (테스트용)', 'middle', '서울특별시', '테스트구', 'test'),
  (4, '다온중학교 (테스트용)', 'middle', '부산광역시', '테스트구', 'test'),
  (5, '사이고등학교 (테스트용)', 'high', '대전광역시', '테스트구', 'test'),
  (6, '한빛고등학교 (테스트용)', 'high', '광주광역시', '테스트구', 'test');

INSERT OR IGNORE INTO badges (code, name, description, kind, threshold) VALUES
  ('class_25', '첫 온기', '우리 반 온도 25°C 달성', 'class', 25),
  ('class_50', '함께 데우기', '우리 반 온도 50°C 달성 · 특별 공동 미션 해금', 'class', 50),
  ('class_75', '따뜻한 교실', '우리 반 온도 75°C 달성 · 학급 보상 투표', 'class', 75),
  ('class_100', '끓는점', '우리 반 온도 100°C · 공동 목표 달성', 'class', 100);
