CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_platform_commission_rule
    ON commission_rules(name)
    WHERE scope = 'platform' AND is_active;

INSERT INTO commission_rules (
    name,
    scope,
    commission_bps,
    is_active,
    valid_from
)
VALUES (
    'Default platform commission',
    'platform',
    0,
    TRUE,
    NOW()
)
ON CONFLICT DO NOTHING;
