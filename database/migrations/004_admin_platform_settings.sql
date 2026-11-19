CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_settings (key, value)
VALUES
    ('marketplace_name', '"Talad Kai Ti"'::jsonb),
    ('default_locale', '"lo"'::jsonb),
    ('currency', '"LAK"'::jsonb)
ON CONFLICT (key) DO NOTHING;
