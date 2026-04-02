-- Migration: 002_seed_defaults
-- Created: 2026-04-03
-- Description: Seed default config and watchlist values

-- Default signal thresholds (web dashboard can override these)
INSERT INTO config (key, value) VALUES
    ('ma_short',              '20'),
    ('ma_long',               '60'),
    ('rsi_period',            '14'),
    ('rsi_oversold',          '30'),
    ('rsi_overbought',        '70'),
    ('scan_interval_minutes', '5'),
    ('signal_cooldown_hours', '24')
ON CONFLICT (key) DO NOTHING;

-- Default watchlist
INSERT INTO watchlist (symbol, name) VALUES
    ('QQQ',  'Invesco QQQ'),
    ('SPY',  'SPDR S&P 500'),
    ('TQQQ', 'ProShares UltraPro QQQ'),
    ('QLD',  'ProShares Ultra QQQ'),
    ('SPYI', 'NEOS S&P 500 High Income'),
    ('QQQI', 'NEOS Nasdaq-100 High Income'),
    ('JEPQ', 'JPMorgan Nasdaq Equity Premium Income')
ON CONFLICT (symbol) DO NOTHING;
