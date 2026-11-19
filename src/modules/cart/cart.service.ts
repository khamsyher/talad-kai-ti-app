import { pool } from "@/lib/db";

export async function addCartItem(userId: string, productId: string, quantity: number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const product = await client.query(
      `
        SELECT p.id
        FROM products p
        JOIN seller_profiles sp ON sp.id = p.seller_profile_id
        WHERE p.id = $1
          AND p.status = 'approved'
          AND sp.status = 'approved'
        FOR UPDATE OF p
      `,
      [productId]
    );
    if (!product.rows[0]) {
      throw new Error("Product is not available.");
    }

    await client.query(
      `
        INSERT INTO carts (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
      `,
      [userId]
    );

    await client.query(
      `
        INSERT INTO cart_items (cart_id, product_id, quantity)
        SELECT c.id, $2, $3
        FROM carts c
        WHERE c.user_id = $1
        ON CONFLICT (cart_id, product_id) DO UPDATE
        SET quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, 100),
            updated_at = NOW()
      `,
      [userId, productId, quantity]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateCartItem(userId: string, productId: string, quantity: number) {
  await pool.query(
    `
      UPDATE cart_items ci
      SET quantity = $3, updated_at = NOW()
      FROM carts c
      WHERE ci.cart_id = c.id
        AND c.user_id = $1
        AND ci.product_id = $2
    `,
    [userId, productId, quantity]
  );
}

export async function removeCartItem(userId: string, productId: string) {
  await pool.query(
    `
      DELETE FROM cart_items ci
      USING carts c
      WHERE ci.cart_id = c.id
        AND c.user_id = $1
        AND ci.product_id = $2
    `,
    [userId, productId]
  );
}
