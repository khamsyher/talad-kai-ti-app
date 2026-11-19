import { query } from "@/lib/db";
import type { ProductCard } from "@/modules/products/product.types";

export type SellerStorefront = {
  id: string;
  shopName: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  identityStatus: "pending" | "approved" | "rejected" | "suspended";
  identityRejectionReason: string | null;
};

export async function findApprovedSellerBySlug(
  slug: string
): Promise<SellerStorefront | null> {
  const result = await query<{
    id: string;
    shop_name: string;
    slug: string;
    description: string | null;
    logo_url: string | null;
    cover_url: string | null;
    status: SellerStorefront["status"];
    identity_status: SellerStorefront["identityStatus"];
    identity_rejection_reason: string | null;
  }>(
    `
      SELECT id, shop_name, slug, description, logo_url, cover_url, status,
             identity_status, identity_rejection_reason
      FROM seller_profiles
      WHERE slug = $1
        AND status = 'approved'
      LIMIT 1
    `,
    [slug]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    shopName: row.shop_name,
    slug: row.slug,
    description: row.description,
    logoUrl: row.logo_url,
    coverUrl: row.cover_url,
    status: row.status,
    identityStatus: row.identity_status,
    identityRejectionReason: row.identity_rejection_reason,
  };
}

export async function listApprovedSellerProducts(
  sellerProfileId: string
): Promise<ProductCard[]> {
  const result = await query<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price_lak: string;
    stock_quantity: number;
    category_name: string;
    category_slug: string;
    seller_name: string;
    seller_slug: string;
    image_url: string | null;
  }>(
    `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.description,
        p.price_lak::text AS price_lak,
        p.stock_quantity,
        c.name AS category_name,
        c.slug AS category_slug,
        sp.shop_name AS seller_name,
        sp.slug AS seller_slug,
        (
          SELECT pi.url
          FROM product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.sort_order ASC, pi.created_at ASC
          LIMIT 1
        ) AS image_url
      FROM products p
      JOIN categories c ON c.id = p.category_id
      JOIN seller_profiles sp ON sp.id = p.seller_profile_id
      WHERE p.seller_profile_id = $1
        AND p.status = 'approved'
        AND p.stock_quantity > 0
      ORDER BY p.created_at DESC
      LIMIT 100
    `,
    [sellerProfileId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    priceLak: row.price_lak,
    stockQuantity: row.stock_quantity,
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    sellerName: row.seller_name,
    sellerSlug: row.seller_slug,
    imageUrl: row.image_url,
  }));
}

export async function findSellerByUserId(userId: string): Promise<SellerStorefront | null> {
  const result = await query<{
    id: string;
    shop_name: string;
    slug: string;
    description: string | null;
    logo_url: string | null;
    cover_url: string | null;
    status: SellerStorefront["status"];
    identity_status: SellerStorefront["identityStatus"];
    identity_rejection_reason: string | null;
  }>(
    `
      SELECT id, shop_name, slug, description, logo_url, cover_url, status,
             identity_status, identity_rejection_reason
      FROM seller_profiles
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  const row = result.rows[0];
  return row
    ? {
        id: row.id,
        shopName: row.shop_name,
        slug: row.slug,
        description: row.description,
        logoUrl: row.logo_url,
        coverUrl: row.cover_url,
        status: row.status,
        identityStatus: row.identity_status,
        identityRejectionReason: row.identity_rejection_reason,
      }
    : null;
}
