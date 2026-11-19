import { query } from "@/lib/db";

export type Payout = {
  id: string;
  sellerProfileId: string;
  shopName: string;
  amountLak: string;
  status: "pending" | "approved" | "processing" | "paid" | "rejected" | "cancelled";
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  rejectionReason: string | null;
  requestedAt: Date;
};

export async function listPayouts(sellerProfileId?: string): Promise<Payout[]> {
  const params: unknown[] = [];
  const condition = sellerProfileId
    ? `WHERE p.seller_profile_id = $1`
    : "";
  if (sellerProfileId) params.push(sellerProfileId);

  const result = await query<{
    id: string;
    seller_profile_id: string;
    shop_name: string;
    amount_lak: string;
    status: Payout["status"];
    bank_name: string | null;
    account_name: string | null;
    account_number: string | null;
    rejection_reason: string | null;
    requested_at: Date;
  }>(
    `
      SELECT p.id,
             p.seller_profile_id,
             sp.shop_name,
             p.amount_lak::text AS amount_lak,
             p.status,
             p.bank_name,
             p.account_name,
             p.account_number,
             p.rejection_reason,
             p.requested_at
      FROM payouts p
      JOIN seller_profiles sp ON sp.id = p.seller_profile_id
      ${condition}
      ORDER BY p.requested_at DESC
      LIMIT 100
    `,
    params
  );

  return result.rows.map((row) => ({
    id: row.id,
    sellerProfileId: row.seller_profile_id,
    shopName: row.shop_name,
    amountLak: row.amount_lak,
    status: row.status,
    bankName: row.bank_name,
    accountName: row.account_name,
    accountNumber: row.account_number,
    rejectionReason: row.rejection_reason,
    requestedAt: row.requested_at,
  }));
}
