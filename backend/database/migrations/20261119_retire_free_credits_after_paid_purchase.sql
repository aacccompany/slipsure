-- Paid credits replace the one-time trial balance; keep the free lot for history.
UPDATE credit_lots AS free_lot
SET expires_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE free_lot.plan_id = 'plan-free'
  AND free_lot.expires_at > CURRENT_TIMESTAMP
  AND EXISTS (
      SELECT 1
      FROM credit_lots AS paid_lot
      JOIN payment_logs AS payment ON payment.id = paid_lot.payment_log_id
      WHERE paid_lot.merchant_id = free_lot.merchant_id
        AND paid_lot.plan_id <> 'plan-free'
        AND payment.status = 'success'
  );
