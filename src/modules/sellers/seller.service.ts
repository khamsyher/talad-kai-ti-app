import { pool } from "@/lib/db";

export type SellerRegistration = {
  shopName: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  coverUrl?: string;
};

export async function registerSeller(userId: string, values: SellerRegistration) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
        UPDATE users
        SET role = 'seller', updated_at = NOW()
        WHERE id = $1
          AND role = 'customer'
      `,
      [userId]
    );
    const result = await client.query(
      `
        INSERT INTO seller_profiles (
          user_id, shop_name, slug, description, logo_url, cover_url, status
        )
        VALUES ($1, $2, $3, NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''), 'pending')
        ON CONFLICT (user_id) DO UPDATE
        SET shop_name = EXCLUDED.shop_name,
            slug = EXCLUDED.slug,
            description = EXCLUDED.description,
            logo_url = EXCLUDED.logo_url,
            cover_url = EXCLUDED.cover_url,
            status = CASE WHEN seller_profiles.status = 'rejected' THEN 'pending' ELSE seller_profiles.status END,
            updated_at = NOW()
        RETURNING id
      `,
      [
        userId,
        values.shopName,
        values.slug,
        values.description ?? "",
        values.logoUrl ?? "",
        values.coverUrl ?? "",
      ]
    );
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
