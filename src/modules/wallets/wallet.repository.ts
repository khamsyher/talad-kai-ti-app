import { query } from "@/lib/db";

export type WalletLedgerEntry = {
  id: string;
  type: string;
  amountLak: string;
  balanceAfterLak: string;
  description: string | null;
  createdAt: Date;
};

export async function getSellerWallet(sellerProfileId: string) {
  const result = await query<{
    id: string;
    available_balance_lak: string;
    pending_balance_lak: string;
  }>(
    `
      SELECT id, available_balance_lak::text AS available_balance_lak,
             pending_balance_lak::text AS pending_balance_lak
      FROM wallets
      WHERE seller_profile_id = $1
      LIMIT 1
    `,
    [sellerProfileId]
  );

  if (!result.rows[0]) {
    return {
      id: null,
      availableBalanceLak: "0",
      pendingBalanceLak: "0",
    };
  }

  return {
    id: result.rows[0].id,
    availableBalanceLak: result.rows[0].available_balance_lak,
    pendingBalanceLak: result.rows[0].pending_balance_lak,
  };
}

export async function listWalletTransactions(
  sellerProfileId: string
): Promise<WalletLedgerEntry[]> {
  const result = await query<{
    id: string;
    type: string;
    amount_lak: string;
    balance_after_lak: string;
    description: string | null;
    created_at: Date;
  }>(
    `
      SELECT wt.id,
             wt.type,
             wt.amount_lak::text AS amount_lak,
             wt.balance_after_lak::text AS balance_after_lak,
             wt.description,
             wt.created_at
      FROM wallet_transactions wt
      JOIN wallets w ON w.id = wt.wallet_id
      WHERE w.seller_profile_id = $1
      ORDER BY wt.created_at DESC
      LIMIT 100
    `,
    [sellerProfileId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    type: row.type,
    amountLak: row.amount_lak,
    balanceAfterLak: row.balance_after_lak,
    description: row.description,
    createdAt: row.created_at,
  }));
}
