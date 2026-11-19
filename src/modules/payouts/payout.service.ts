import { pool } from "@/lib/db";

export async function requestPayout(
  sellerProfileId: string,
  amountLak: number,
  bankName: string,
  accountName: string,
  accountNumber: string
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const walletResult = await client.query(
      `
        SELECT id, available_balance_lak
        FROM wallets
        WHERE seller_profile_id = $1
        FOR UPDATE
      `,
      [sellerProfileId]
    );
    const wallet = walletResult.rows[0];
    if (!wallet || Number(wallet.available_balance_lak) < amountLak) {
      throw new Error("Insufficient available wallet balance.");
    }

    const balanceAfterLak =
      Number(wallet.available_balance_lak) - amountLak;
    await client.query(
      `
        UPDATE wallets
        SET available_balance_lak = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [wallet.id, balanceAfterLak]
    );

    const ledgerResult = await client.query(
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
        VALUES ($1, 'payout', $2, $3, 'payout_request', gen_random_uuid(), 'Payout request')
        RETURNING id, reference_id
      `,
      [wallet.id, -amountLak, balanceAfterLak]
    );
    const ledger = ledgerResult.rows[0];

    const payoutResult = await client.query(
      `
        INSERT INTO payouts (
          seller_profile_id,
          wallet_transaction_id,
          amount_lak,
          status,
          bank_name,
          account_name,
          account_number
        )
        VALUES ($1, $2, $3, 'pending', $4, $5, $6)
        RETURNING id
      `,
      [
        sellerProfileId,
        ledger.id,
        amountLak,
        bankName,
        accountName,
        accountNumber,
      ]
    );
    await client.query("COMMIT");
    return payoutResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function approvePayout(payoutId: string) {
  const result = await pool.query(
    `
      UPDATE payouts
      SET status = 'paid', processed_at = NOW(), updated_at = NOW()
      WHERE id = $1
        AND status = 'pending'
      RETURNING id
    `,
    [payoutId]
  );
  return result.rows[0] ?? null;
}

export async function rejectPayout(payoutId: string, reason: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const payoutResult = await client.query(
      `
        SELECT p.*, w.id AS wallet_id, w.available_balance_lak
        FROM payouts p
        JOIN seller_profiles sp ON sp.id = p.seller_profile_id
        JOIN wallets w ON w.seller_profile_id = sp.id
        WHERE p.id = $1
          AND p.status = 'pending'
        FOR UPDATE OF p, w
      `,
      [payoutId]
    );
    const payout = payoutResult.rows[0];
    if (!payout) {
      await client.query("ROLLBACK");
      return null;
    }

    const balanceAfterLak =
      Number(payout.available_balance_lak) + Number(payout.amount_lak);

    await client.query(
      `
        UPDATE payouts
        SET status = 'rejected',
            rejection_reason = $2,
            processed_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
      `,
      [payoutId, reason]
    );

    await client.query(
      `
        UPDATE wallets
        SET available_balance_lak = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [payout.wallet_id, balanceAfterLak]
    );

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
        VALUES ($1, 'reversal', $2, $3, 'payout', $4, $5)
        ON CONFLICT (reference_type, reference_id, type) DO NOTHING
      `,
      [
        payout.wallet_id,
        Number(payout.amount_lak),
        balanceAfterLak,
        payout.id,
        reason,
      ]
    );

    await client.query("COMMIT");
    return payout;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
