-- Migration: 001_initial_schema
-- Created: 2026-04-03
-- Description: Create initial tables for Signalight

-- Watchlist: stocks the engine should scan
CREATE TABLE IF NOT EXISTS watchlist (
    id       BIGSERIAL PRIMARY KEY,
    symbol   TEXT UNIQUE NOT NULL,
    name     TEXT,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    active   BOOLEAN DEFAULT TRUE
);

-- Signals: trade signals detected by the engine
CREATE TABLE IF NOT EXISTS signals (
    id                 BIGSERIAL PRIMARY KEY,
    symbol             TEXT NOT NULL,
    signal_type        TEXT NOT NULL,
    severity           TEXT NOT NULL,   -- INFO | WARNING | ACTION
    message            TEXT,
    indicator_snapshot JSONB,
    price_at_signal    NUMERIC,
    created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Scan log: each engine scan run
CREATE TABLE IF NOT EXISTS scan_log (
    id              BIGSERIAL PRIMARY KEY,
    scanned_at      TIMESTAMPTZ DEFAULT NOW(),
    symbols_scanned INT,
    signals_found   INT,
    errors          TEXT
);

-- Config: key-value settings editable from the web dashboard
CREATE TABLE IF NOT EXISTS config (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_signals_symbol     ON signals(symbol);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_type       ON signals(signal_type);

-- Enable Realtime for live dashboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE signals;
ALTER PUBLICATION supabase_realtime ADD TABLE watchlist;
