-- Statistiques SM-2 de l'utilisateur local, une ligne par pays.
CREATE TABLE IF NOT EXISTS user_stats (
    country_id      INTEGER PRIMARY KEY,
    easiness_factor REAL    NOT NULL,
    repetitions     INTEGER NOT NULL,
    interval_days   INTEGER NOT NULL,
    next_review     TEXT    NOT NULL,  -- datetime au format ISO 8601
    total_answers   INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0
);
