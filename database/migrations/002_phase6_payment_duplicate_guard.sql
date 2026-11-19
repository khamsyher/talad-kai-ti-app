CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_one_active_per_order
    ON payments(order_id)
    WHERE status IN ('pending', 'authorized', 'paid');
