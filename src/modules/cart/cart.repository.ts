import { query } from "@/lib/db";

export type CartItem = {
  productId: string;
  name: string;
  slug: string;
  priceLak: string;
  quantity: number;
  stockQuantity: number;
  sellerName: string;
  sellerSlug: string;
  imageUrl: string | null;
};

export async function getCartItems(userId: string): Promise<CartItem[]> {
  const result = await query<{
    product_id: string;
    name: string;
    slug: string;
    price_lak: string;
    quantity: number;
    stock_quantity: number;
    seller_name: string;
    seller_slug: string;
    image_url: string | null;
  }>(
    `
      SELECT
        p.id AS product_id,
        p.name,
        p.slug,
        p.price_lak::text AS price_lak,
        ci.quantity,
        p.stock_quantity,
        sp.shop_name AS seller_name,
        sp.slug AS seller_slug,
        (
          SELECT pi.url
          FROM product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.sort_order ASC, pi.created_at ASC
          LIMIT 1
        ) AS image_url
      FROM carts c
      JOIN cart_items ci ON ci.cart_id = c.id
      JOIN products p ON p.id = ci.product_id
      JOIN seller_profiles sp ON sp.id = p.seller_profile_id
      WHERE c.user_id = $1
      ORDER BY ci.updated_at DESC
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    productId: row.product_id,
    name: row.name,
    slug: row.slug,
    priceLak: row.price_lak,
    quantity: row.quantity,
    stockQuantity: row.stock_quantity,
    sellerName: row.seller_name,
    sellerSlug: row.seller_slug,
    imageUrl: row.image_url,
  }));
}
