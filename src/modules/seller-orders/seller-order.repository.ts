import { query } from "@/lib/db";

export type SellerOrder = {
  id: string;
  orderNumber: string;
  status: string;
  subtotalLak: string;
  createdAt: Date;
};

export async function listSellerOrders(
  sellerProfileId: string
): Promise<SellerOrder[]> {
  const result = await query<{
    id: string;
    order_number: string;
    status: string;
    subtotal_lak: string;
    created_at: Date;
  }>(
    `
      SELECT
        so.id,
        o.order_number,
        so.status,
        so.subtotal_lak::text AS subtotal_lak,
        so.created_at
      FROM seller_orders so
      JOIN orders o ON o.id = so.order_id
      WHERE so.seller_profile_id = $1
      ORDER BY so.created_at DESC
      LIMIT 100
    `,
    [sellerProfileId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    subtotalLak: row.subtotal_lak,
    createdAt: row.created_at,
  }));
}

export async function getSellerSalesSummary(sellerProfileId: string) {
  const result = await query<{
    product_count: string;
    approved_count: string;
    order_count: string;
    completed_sales_lak: string;
  }>(
    `
      SELECT
        (SELECT COUNT(*) FROM products WHERE seller_profile_id = $1) AS product_count,
        (SELECT COUNT(*) FROM products WHERE seller_profile_id = $1 AND status = 'approved') AS approved_count,
        (SELECT COUNT(*) FROM seller_orders WHERE seller_profile_id = $1) AS order_count,
        (
          SELECT COALESCE(SUM(subtotal_lak), 0)::text
          FROM seller_orders
          WHERE seller_profile_id = $1
            AND status = 'completed'
        ) AS completed_sales_lak
    `,
    [sellerProfileId]
  );

  return result.rows[0];
}
