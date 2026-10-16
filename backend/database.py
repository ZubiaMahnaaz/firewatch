import sqlite3
import os
import shutil
from typing import Generator

def resolve_db_path() -> str:
    # On AWS Lambda / Vercel Serverless, deployment bundle is read-only.
    is_serverless = bool(
        os.environ.get("VERCEL") or 
        os.environ.get("AWS_LAMBDA_FUNCTION_NAME") or 
        os.environ.get("LAMBDA_TASK_ROOT") or 
        os.environ.get("VERCEL_ENV")
    )
    if is_serverless:
        target = "/tmp/firewatch.db"
    else:
        env_path = os.environ.get("FIREWATCH_DB_PATH")
        if env_path:
            target = env_path
        else:
            default_path = os.path.join(os.path.dirname(__file__), "firewatch.db")
            try:
                test_file = os.path.join(os.path.dirname(__file__), ".write_test")
                with open(test_file, "w") as f:
                    f.write("ok")
                os.remove(test_file)
                target = default_path
            except (OSError, PermissionError):
                target = "/tmp/firewatch.db"

    if target.startswith("/tmp") and not os.path.exists(target):
        bundled = os.path.join(os.path.dirname(__file__), "firewatch.db")
        if os.path.exists(bundled):
            try:
                shutil.copy2(bundled, target)
            except Exception:
                pass
    return target

DB_PATH = resolve_db_path()

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS scoring_config (
        id INTEGER PRIMARY KEY,
        w_frp REAL DEFAULT 0.35,
        w_recency REAL DEFAULT 0.25,
        w_confidence REAL DEFAULT 0.20,
        w_persistence REAL DEFAULT 0.20,
        half_life_hours REAL DEFAULT 6.0,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    INSERT OR IGNORE INTO scoring_config (id, w_frp, w_recency, w_confidence, w_persistence, half_life_hours)
    VALUES (1, 0.35, 0.25, 0.20, 0.20, 6.0);
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        obs_id TEXT UNIQUE NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        brightness REAL,
        scan REAL,
        track REAL,
        acq_date TEXT NOT NULL,
        acq_time TEXT NOT NULL,
        acq_datetime TEXT NOT NULL,
        satellite TEXT,
        instrument TEXT,
        confidence TEXT,
        confidence_score REAL DEFAULT 0.5,
        version TEXT,
        bright_t31 REAL,
        frp REAL DEFAULT 0.0,
        daynight TEXT DEFAULT 'D',
        region TEXT DEFAULT 'Western US',
        priority_score REAL DEFAULT 0.0,
        priority_tier TEXT DEFAULT 'Tier-4 Routine',
        frp_points REAL DEFAULT 0.0,
        recency_points REAL DEFAULT 0.0,
        conf_points REAL DEFAULT 0.0,
        persistence_points REAL DEFAULT 0.0,
        is_repeat INTEGER DEFAULT 0,
        repeat_cluster_id TEXT,
        repeat_count INTEGER DEFAULT 1,
        source_type TEXT DEFAULT 'synthetic_sample',
        anomaly_flags TEXT DEFAULT '',
        anomaly_explanation TEXT DEFAULT '',
        validation_status TEXT DEFAULT 'valid',
        review_status TEXT DEFAULT 'unreviewed',
        review_notes TEXT DEFAULT '',
        reviewed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Check and migrate columns if database already exists
    cursor.execute("PRAGMA table_info(observations);")
    existing_cols = [c[1] for c in cursor.fetchall()]
    if "anomaly_flags" not in existing_cols:
        cursor.execute("ALTER TABLE observations ADD COLUMN anomaly_flags TEXT DEFAULT '';")
    if "anomaly_explanation" not in existing_cols:
        cursor.execute("ALTER TABLE observations ADD COLUMN anomaly_explanation TEXT DEFAULT '';")

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_obs_datetime ON observations(acq_datetime);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_obs_priority ON observations(priority_score);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_obs_tier ON observations(priority_tier);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_obs_coords ON observations(latitude, longitude);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_obs_source ON observations(source_type);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_obs_cluster ON observations(repeat_cluster_id);")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS validation_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id TEXT UNIQUE NOT NULL,
        filename TEXT NOT NULL,
        imported_at TEXT DEFAULT CURRENT_TIMESTAMP,
        total_rows INTEGER DEFAULT 0,
        valid_rows INTEGER DEFAULT 0,
        invalid_rows INTEGER DEFAULT 0,
        duplicate_rows INTEGER DEFAULT 0,
        status TEXT DEFAULT 'completed',
        details_json TEXT
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        obs_id TEXT,
        details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    conn.commit()
    conn.close()

# Ensure schema is ready on import
init_db()

if __name__ == "__main__":
    print("Database initialized successfully at", DB_PATH)
