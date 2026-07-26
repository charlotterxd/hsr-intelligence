-- Initialize HSR PF database
-- This script is auto-executed by PostgreSQL when the container starts

-- Create character_info table
CREATE TABLE IF NOT EXISTS character_info (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255),
    slug VARCHAR(255) UNIQUE,
    rarity INTEGER,
    path VARCHAR(100),
    element VARCHAR(100),
    role VARCHAR(100),
    signature VARCHAR(255),
    availability VARCHAR(100),
    is_giveaway BOOLEAN,
    giveaway_choose_group VARCHAR(255),
    free_later VARCHAR(255),
    released_patch VARCHAR(50)
);

-- Create player_records_pf table
CREATE TABLE IF NOT EXISTS player_records_pf (
    team_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    name TEXT NOT NULL,
    uid TEXT,
    node INTEGER,
    round_num FLOAT,
    version FLOAT,
    weapon TEXT,
    cons INTEGER,
    PRIMARY KEY (team_id, filename, name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_player_records_pf_version ON player_records_pf(version);
CREATE INDEX IF NOT EXISTS idx_player_records_pf_name ON player_records_pf(name);
CREATE INDEX IF NOT EXISTS idx_player_records_pf_uid ON player_records_pf(uid);
CREATE INDEX IF NOT EXISTS idx_character_info_slug ON character_info(slug);
CREATE INDEX IF NOT EXISTS idx_character_info_name ON character_info(name);

-- Create player_records_moc table
CREATE TABLE IF NOT EXISTS player_records_moc (
    team_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    name TEXT NOT NULL,
    uid TEXT,
    node INTEGER,
    round_num FLOAT,
    version FLOAT,
    weapon TEXT,
    cons INTEGER,
    PRIMARY KEY (team_id, filename, name)
);

CREATE INDEX IF NOT EXISTS idx_player_records_moc_version ON player_records_moc(version);
CREATE INDEX IF NOT EXISTS idx_player_records_moc_name ON player_records_moc(name);
CREATE INDEX IF NOT EXISTS idx_player_records_moc_uid ON player_records_moc(uid);

-- Create player_records_as table
CREATE TABLE IF NOT EXISTS player_records_as (
    team_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    name TEXT NOT NULL,
    uid TEXT,
    node INTEGER,
    round_num FLOAT,
    version FLOAT,
    weapon TEXT,
    cons INTEGER,
    PRIMARY KEY (team_id, filename, name)
);

CREATE INDEX IF NOT EXISTS idx_player_records_as_version ON player_records_as(version);
CREATE INDEX IF NOT EXISTS idx_player_records_as_name ON player_records_as(name);
CREATE INDEX IF NOT EXISTS idx_player_records_as_uid ON player_records_as(uid);

-- Create player_records_anomaly table
CREATE TABLE IF NOT EXISTS player_records_anomaly (
    filename TEXT NOT NULL,
    uid TEXT NOT NULL,
    team_id TEXT NOT NULL,
    floor INTEGER NOT NULL,
    name TEXT NOT NULL,
    round_num INTEGER,
    version FLOAT,
    weapon TEXT,
    cons INTEGER,
    PRIMARY KEY (filename, uid, team_id, floor, name)
);

CREATE INDEX IF NOT EXISTS idx_player_records_anomaly_version ON player_records_anomaly(version);
CREATE INDEX IF NOT EXISTS idx_player_records_anomaly_floor ON player_records_anomaly(floor);
CREATE INDEX IF NOT EXISTS idx_player_records_anomaly_name ON player_records_anomaly(name);
CREATE INDEX IF NOT EXISTS idx_pra_uid_version_teamid ON player_records_anomaly(uid, version, team_id);
CREATE INDEX IF NOT EXISTS idx_pra_uid_version_teamid_name ON player_records_anomaly(uid, version, team_id, name);
CREATE INDEX IF NOT EXISTS idx_pra_uid_version_floor ON player_records_anomaly(uid, version, floor);

-- Verify tables created
SELECT 'character_info' as table_name, COUNT(*) as row_count FROM character_info
UNION ALL
SELECT 'player_records_pf', COUNT(*) FROM player_records_pf
UNION ALL
SELECT 'player_records_moc', COUNT(*) FROM player_records_moc
UNION ALL
SELECT 'player_records_as', COUNT(*) FROM player_records_as
UNION ALL
SELECT 'player_records_anomaly', COUNT(*) FROM player_records_anomaly;
