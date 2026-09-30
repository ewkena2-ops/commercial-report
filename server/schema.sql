-- Klever department reports — Cloudflare D1 schema
-- No login: each department's link carries a secret code; only its SHA-256 hash is stored.
CREATE TABLE IF NOT EXISTS link_keys (
  dept       TEXT NOT NULL,
  key_hash   TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS records (
  dept       TEXT NOT NULL,
  dataset    TEXT NOT NULL,
  rid        TEXT NOT NULL,
  data       TEXT NOT NULL,
  deleted    INTEGER NOT NULL DEFAULT 0,
  rev        INTEGER NOT NULL,
  updated_at TEXT,
  updated_by TEXT,
  PRIMARY KEY (dept, dataset, rid)
);
CREATE INDEX IF NOT EXISTS records_dept_rev ON records(dept, rev);
CREATE TABLE IF NOT EXISTS settings (
  dept       TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  rev        INTEGER NOT NULL,
  updated_at TEXT,
  updated_by TEXT
);
CREATE TABLE IF NOT EXISTS meta (
  k TEXT PRIMARY KEY,
  v INTEGER NOT NULL
);
INSERT OR IGNORE INTO meta (k, v) VALUES ('rev', 0);
-- Tables of the earlier login version, no longer used
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS attempts;
