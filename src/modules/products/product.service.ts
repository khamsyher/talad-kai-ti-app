import { pool } from "@/lib/db";

export type ProductInput = {
  name: string;
  slug: string;
  categoryId: string;
  description?: string;
  priceLak: number;
  stockQuantity: number;
};

export async function createSellerProduct(
  sellerProfileId: string,
  values: ProductInput
) {
  const sellerResult = await pool.query(
    `
      SELECT id
      FROM seller_profiles
      WHERE id = $1
        AND status = 'approved'
        AND identity_status = 'approved'
    `,
    [sellerProfileId]
  );
  if (!sellerResult.rows[0]) {
    throw new Error("Seller identity and shop approval are required.");
  }

  const result = await pool.query(
    `
      INSERT INTO products (
        seller_profile_id,
        category_id,
        name,
        slug,
        description,
        price_lak,
        stock_quantity,
        status
      )
      VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, $7, 'pending')
      RETURNING id
    `,
    [
      sellerProfileId,
      values.categoryId,
      values.name,
      values.slug,
      values.description ?? "",
      values.priceLak,
      values.stockQuantity,
    ]
  );
  return result.rows[0];
}

export async function updateSellerProduct(
  sellerProfileId: string,
  productId: string,
  values: ProductInput
) {
  const sellerResult = await pool.query(
    `
      SELECT id
      FROM seller_profiles
      WHERE id = $1
        AND status = 'approved'
        AND identity_status = 'approved'
    `,
    [sellerProfileId]
  );
  if (!sellerResult.rows[0]) {
    throw new Error("Seller identity and shop approval are required.");
  }

  const result = await pool.query(
    `
      UPDATE products
      SET
        category_id = $3,
        name = $4,
        slug = $5,
        description = NULLIF($6, ''),
        price_lak = $7,
        stock_quantity = $8,
        status = CASE WHEN status = 'rejected' THEN 'pending' ELSE status END,
        updated_at = NOW()
      WHERE id = $1
        AND seller_profile_id = $2
      RETURNING id
    `,
    [
      productId,
      sellerProfileId,
      values.categoryId,
      values.name,
      values.slug,
      values.description ?? "",
      values.priceLak,
      values.stockQuantity,
    ]
  );
  return result.rows[0] ?? null;
}

export async function setSellerProductStatus(
  sellerProfileId: string,
  productId: string,
  status: "draft" | "pending" | "archived"
) {
  if (status === "pending") {
    const sellerResult = await pool.query(
      `
        SELECT id
        FROM seller_profiles
        WHERE id = $1
          AND status = 'approved'
          AND identity_status = 'approved'
      `,
      [sellerProfileId]
    );
    if (!sellerResult.rows[0]) {
      throw new Error("Seller identity and shop approval are required.");
    }
  }

  const result = await pool.query(
    `
      UPDATE products
      SET status = $3, rejection_reason = NULL, updated_at = NOW()
      WHERE id = $1
        AND seller_profile_id = $2
      RETURNING id
    `,
    [productId, sellerProfileId, status]
  );
  return result.rows[0] ?? null;
}
