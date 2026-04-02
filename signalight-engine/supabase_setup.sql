-- ============================================================
-- Signalight — Supabase Schema Setup
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Watchlist: stocks to scan
CREATE TABLE IF NOT EXISTS watchlist (
    id       BIGSERIAL PRIMARY KEY,
    symbol   TEXT UNIQUE NOT NULL,
    name     TEXT,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    active   BOOLEAN DEFAULT TRUE
);

-- Signals: detected trade signals
CREATE TABLE IF NOT EXISTS signals (
    id                 BIGSERIAL PRIMARY KEY,
    symbol             TEXT NOT NULL,
    signal_type        TEXT NOT NULL,
    severity           TEXT NOT NULL,
    message            TEXT,
    indicator_snapshot JSONB,
    price_at_signal    NUMERIC,
    created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Scan log: history of engine scan runs
CREATE TABLE IF NOT EXISTS scan_log (
    id              BIGSERIAL PRIMARY KEY,
    scanned_at      TIMESTAMPTZ DEFAULT NOW(),
    symbols_scanned INT,
    signals_found   INT,
    errors          TEXT
);

-- Config: user-editable settings (web dashboard writes, engine reads)
CREATE TABLE IF NOT EXISTS config (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Seed: default config values
-- ============================================================
INSERT INTO config (key, value) VALUES
    ('ma_short',              '20'),
    ('ma_long',               '60'),
    ('rsi_period',            '14'),
    ('rsi_oversold',          '30'),
    ('rsi_overbought',        '70'),
    ('scan_interval_minutes', '5'),
    ('signal_cooldown_hours', '24')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Seed: default watchlist
-- ============================================================
INSERT INTO watchlist (symbol, name) VALUES
    ('QQQ',  'Invesco QQQ'),
    ('SPY',  'SPDR S&P 500'),
    ('TQQQ', 'ProShares UltraPro QQQ'),
    ('QLD',  'ProShares Ultra QQQ'),
    ('SPYI', 'NEOS S&P 500 High Income'),
    ('QQQI', 'NEOS Nasdaq-100 High Income'),
    ('JEPQ', 'JPMorgan Nasdaq Equity Premium Income')
ON CONFLICT (symbol) DO NOTHING;

-- ============================================================
-- Enable Realtime for live web dashboard updates
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE signals;
ALTER PUBLICATION supabase_realtime ADD TABLE watchlist;
