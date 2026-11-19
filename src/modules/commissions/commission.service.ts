import { pool } from "@/lib/db";

export async function createPendingCommission(sellerOrderId: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      `
        SELECT id, seller_profile_id, subtotal_lak, status
        FROM seller_orders
        WHERE id = $1
        FOR UPDATE
      `,
      [sellerOrderId]
    );
    const sellerOrder = orderResult.rows[0];
    if (!sellerOrder || sellerOrder.status !== "completed") {
      await client.query("ROLLBACK");
      return null;
    }

    const existing = await client.query(
      "SELECT id, status FROM commission_transactions WHERE seller_order_id = $1",
      [sellerOrderId]
    );
    if (existing.rows[0]) {
      await client.query("COMMIT");
      return existing.rows[0];
    }

    const sellerRule = await client.query(
      `
        SELECT id, commission_bps
        FROM commission_rules
        WHERE scope = 'seller'
          AND seller_profile_id = $1
          AND is_active = TRUE
          AND valid_from <= NOW()
          AND (valid_until IS NULL OR valid_until >= NOW())
        ORDER BY valid_from DESC
        LIMIT 1
      `,
      [sellerOrder.seller_profile_id]
    );

    let rule = sellerRule.rows[0] as
      | { id: string; commission_bps: number }
      | undefined;

    if (!rule) {
      const categoryResult = await client.query(
        `
          SELECT DISTINCT c.id
          FROM order_items oi
          JOIN products p ON p.id = oi.product_id
          JOIN categories c ON c.id = p.category_id
          WHERE oi.seller_order_id = $1
        `,
        [sellerOrderId]
      );

      if (categoryResult.rows.length === 1) {
        const categoryRule = await client.query(
          `
            SELECT id, commission_bps
            FROM commission_rules
            WHERE scope = 'category'
              AND category_id = $1
              AND is_active = TRUE
              AND valid_from <= NOW()
              AND (valid_until IS NULL OR valid_until >= NOW())
            ORDER BY valid_from DESC
            LIMIT 1
          `,
          [categoryResult.rows[0].id]
        );
        rule = categoryRule.rows[0];
      }
    }

    if (!rule) {
      const platformRule = await client.query(
        `
          SELECT id, commission_bps
          FROM commission_rules
          WHERE scope = 'platform'
            AND is_active = TRUE
            AND valid_from <= NOW()
            AND (valid_until IS NULL OR valid_until >= NOW())
          ORDER BY valid_from DESC
          LIMIT 1
        `
      );
      rule = platformRule.rows[0];
    }

    const commissionBps = rule?.commission_bps ?? 0;
    const orderAmountLak = Number(sellerOrder.subtotal_lak);
    const commissionAmountLak = Math.floor(
      (orderAmountLak * commissionBps) / 10000
    );
    const netAmountLak = orderAmountLak - commissionAmountLak;

    await client.query(
      `
        INSERT INTO commission_transactions (
          seller_order_id,
          commission_rule_id,
          order_amount_lak,
          applied_commission_bps,
          commission_amount_lak,
          status
        )
        VALUES ($1, $2, $3, $4, $5, 'pending')
      `,
      [
        sellerOrderId,
        rule?.id ?? null,
        orderAmountLak,
        commissionBps,
        commissionAmountLak,
      ]
    );

    await client.query(
      `
        INSERT INTO wallets (seller_profile_id, pending_balance_lak)
        VALUES ($1, $2)
        ON CONFLICT (seller_profile_id) DO UPDATE
        SET pending_balance_lak = wallets.pending_balance_lak + EXCLUDED.pending_balance_lak,
            updated_at = NOW()
      `,
      [sellerOrder.seller_profile_id, netAmountLak]
    );

    await client.query("COMMIT");
    return { sellerOrderId, commissionAmountLak, netAmountLak };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function markCommissionAvailable(commissionId: string) {
  const result = await pool.query(
    `
      UPDATE commission_transactions
      SET status = 'available', updated_at = NOW()
      WHERE id = $1
        AND status = 'pending'
      RETURNING id
    `,
    [commissionId]
  );
  return result.rows[0] ?? null;
}

export async function creditCommissionToWallet(commissionId: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const commissionResult = await client.query(
      `
        SELECT ct.*, so.seller_profile_id
        FROM commission_transactions ct
        JOIN seller_orders so ON so.id = ct.seller_order_id
        WHERE ct.id = $1
        FOR UPDATE OF ct
      `,
      [commissionId]
    );
    const commission = commissionResult.rows[0];
    if (!commission || commission.status !== "available") {
      await client.query("ROLLBACK");
      return null;
    }

    const netAmountLak =
      Number(commission.order_amount_lak) -
      Number(commission.commission_amount_lak);

    const walletResult = await client.query(
      `
        SELECT id, available_balance_lak, pending_balance_lak
        FROM wallets
        WHERE seller_profile_id = $1
        FOR UPDATE
      `,
      [commission.seller_profile_id]
    );
    const wallet = walletResult.rows[0];
    if (!wallet) {
      throw new Error("Wallet not found.");
    }
    if (Number(wallet.pending_balance_lak) < netAmountLak) {
      throw new Error("Pending wallet balance is insufficient.");
    }

    if (netAmountLak > 0) {
      await client.query(
        `
          INSERT INTO wallet_transactions (
            wallet_id,
            type,
            amount_lak,
            balance_after_lak,
            reference_type,
            reference_id,
            description
          )
          VALUES (
            $1,
            'commission_credit',
            $2,
            $3,
            'commission_transaction',
            $4,
            'Seller proceeds after platform commission'
          )
          ON CONFLICT (reference_type, reference_id, type) DO NOTHING
        `,
        [
          wallet.id,
          netAmountLak,
          Number(wallet.available_balance_lak) + netAmountLak,
          commission.id,
        ]
      );
    }

    await client.query(
      `
        UPDATE wallets
        SET
          available_balance_lak = available_balance_lak + $2,
          pending_balance_lak = pending_balance_lak - $2,
          updated_at = NOW()
        WHERE id = $1
      `,
      [wallet.id, netAmountLak]
    );

    await client.query(
      `
        UPDATE commission_transactions
        SET status = 'credited', updated_at = NOW()
        WHERE id = $1
      `,
      [commissionId]
    );

    await client.query("COMMIT");
    return { commissionId, netAmountLak };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function reverseCommission(commissionId: string, reason: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const commissionResult = await client.query(
      `
        SELECT ct.*, so.seller_profile_id
        FROM commission_transactions ct
        JOIN seller_orders so ON so.id = ct.seller_order_id
        WHERE ct.id = $1
        FOR UPDATE OF ct
      `,
      [commissionId]
    );
    const commission = commissionResult.rows[0];
    if (!commission || commission.status === "reversed") {
      await client.query("ROLLBACK");
      return null;
    }

    const netAmountLak =
      Number(commission.order_amount_lak) -
      Number(commission.commission_amount_lak);

    const walletResult = await client.query(
      `
        SELECT id, available_balance_lak, pending_balance_lak
        FROM wallets
        WHERE seller_profile_id = $1
        FOR UPDATE
      `,
      [commission.seller_profile_id]
    );
    const wallet = walletResult.rows[0];

    if (commission.status === "credited" && wallet) {
      if (Number(wallet.available_balance_lak) < netAmountLak) {
        throw new Error("Available wallet balance is insufficient for reversal.");
      }
      await client.query(
        `
          INSERT INTO wallet_transactions (
            wallet_id,
            type,
            amount_lak,
            balance_after_lak,
            reference_type,
            reference_id,
            description
          )
          VALUES (
            $1,
            'reversal',
            $2,
            $3,
            'commission_transaction',
            $4,
            $5
          )
          ON CONFLICT (reference_type, reference_id, type) DO NOTHING
        `,
        [
          wallet.id,
          -netAmountLak,
          Number(wallet.available_balance_lak) - netAmountLak,
          commission.id,
          reason,
        ]
      );
      await client.query(
        `
          UPDATE wallets
          SET available_balance_lak = available_balance_lak - $2,
              updated_at = NOW()
          WHERE id = $1
        `,
        [wallet.id, netAmountLak]
      );
    } else if (wallet) {
      await client.query(
        `
          UPDATE wallets
          SET pending_balance_lak =
            GREATEST(pending_balance_lak - $2, 0),
            updated_at = NOW()
          WHERE id = $1
        `,
        [wallet.id, netAmountLak]
      );
    }

    await client.query(
      `
        UPDATE commission_transactions
        SET status = 'reversed',
            reversed_at = NOW(),
            reversal_reason = $2,
            updated_at = NOW()
        WHERE id = $1
      `,
      [commission.id, reason]
    );

    await client.query("COMMIT");
    return { commissionId: commission.id };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
