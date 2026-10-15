ALTER TABLE quota_alerts
    ADD COLUMN IF NOT EXISTS kind VARCHAR(16) NOT NULL DEFAULT 'balance';

ALTER TABLE quota_alerts
    DROP CONSTRAINT IF EXISTS quota_alerts_threshold_check,
    DROP CONSTRAINT IF EXISTS quota_alerts_merchant_id_cycle_lot_id_threshold_key,
    DROP CONSTRAINT IF EXISTS quota_alerts_kind_threshold_check,
    DROP CONSTRAINT IF EXISTS quota_alerts_lot_kind_threshold_key;

ALTER TABLE quota_alerts
    ADD CONSTRAINT quota_alerts_kind_threshold_check CHECK (
        (kind = 'balance' AND threshold IN (20, 5, 0)) OR
        (kind = 'expiry' AND threshold IN (7, 3, 1))
    ),
    ADD CONSTRAINT quota_alerts_lot_kind_threshold_key
        UNIQUE (merchant_id, cycle_lot_id, kind, threshold);
