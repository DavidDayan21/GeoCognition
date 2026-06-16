-- Initial schema. All statements are idempotent (IF NOT EXISTS) so the
-- script can be applied safely on every startup.

CREATE TABLE IF NOT EXISTS countries (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  capital TEXT NOT NULL,
  capital_fr TEXT NOT NULL,
  continent TEXT NOT NULL,
  iso_alpha2 TEXT NOT NULL UNIQUE,
  iso_alpha3 TEXT NOT NULL UNIQUE,
  lat REAL,
  lng REAL,
  -- JSON-encoded array of bordering ISO alpha-3 codes (Border Run mode).
  borders TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS user_stats (
  country_id INTEGER NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('capital', 'flag')),
  ef REAL NOT NULL DEFAULT 2.5,
  repetitions INTEGER NOT NULL DEFAULT 0,
  interval_days INTEGER NOT NULL DEFAULT 0,
  next_review TEXT NOT NULL,
  last_reviewed TEXT,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (country_id, mode),
  FOREIGN KEY (country_id) REFERENCES countries(id)
);

CREATE TABLE IF NOT EXISTS answers_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  country_id INTEGER NOT NULL,
  mode TEXT NOT NULL,
  user_input TEXT,
  is_correct INTEGER NOT NULL,
  quality INTEGER NOT NULL,
  response_time_ms INTEGER,
  answered_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_stats_next_review ON user_stats(next_review, mode);
CREATE INDEX IF NOT EXISTS idx_answers_log_answered_at ON answers_log(answered_at);
