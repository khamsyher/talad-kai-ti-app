import { query } from "@/lib/db";
import type { ProductCard, ProductDetail, ProductFilters } from "./product.types";

export async function searchApprovedProducts(
  filters: ProductFilters
): Promise<ProductCard[]> {
  const conditions = [
    "p.status = 'approved'",
    "sp.status = 'approved'",
    "p.stock_quantity > 0",
  ];
  const params: unknown[] = [];

  if (filters.query) {
    params.push(filters.query);
    conditions.push(`(p.name ILIKE '%' || $${params.length} || '%' OR p.description ILIKE '%' || $${params.length} || '%')`);
  }
  if (filters.category) {
    params.push(filters.category);
    conditions.push(`c.slug = $${params.length}`);
  }
  if (filters.minPriceLak !== undefined) {
    params.push(filters.minPriceLak);
    conditions.push(`p.price_lak >= $${params.length}`);
  }
  if (filters.maxPriceLak !== undefined) {
    params.push(filters.maxPriceLak);
    conditions.push(`p.price_lak <= $${params.length}`);
  }

  const orderBy =
    filters.sort === "price_asc"
      ? "p.price_lak ASC"
      : filters.sort === "price_desc"
        ? "p.price_lak DESC"
        : "p.created_at DESC";

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
      WHERE ${conditions.join(" AND ")}
      ORDER BY ${orderBy}
      LIMIT 100
    `,
    params
  );

  return result.rows.map(mapProductCard);
}

export async function findApprovedProductBySlug(
  slug: string
): Promise<ProductDetail | null> {
  const productResult = await query<{
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
    seller_description: string | null;
    seller_logo_url: string | null;
    seller_cover_url: string | null;
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
        sp.description AS seller_description,
        sp.logo_url AS seller_logo_url,
        sp.cover_url AS seller_cover_url,
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
      WHERE p.slug = $1
        AND p.status = 'approved'
        AND sp.status = 'approved'
      LIMIT 1
    `,
    [slug]
  );

  const product = productResult.rows[0];
  if (!product) {
    return null;
  }

  const imagesResult = await query<{
    id: string;
    url: string;
    alt_text: string | null;
  }>(
    `
      SELECT id, url, alt_text
      FROM product_images
      WHERE product_id = $1
      ORDER BY sort_order ASC, created_at ASC
    `,
    [product.id]
  );

  return {
    ...mapProductCard(product),
    sellerDescription: product.seller_description,
    sellerLogoUrl: product.seller_logo_url,
    sellerCoverUrl: product.seller_cover_url,
    images: imagesResult.rows.map((image) => ({
      id: image.id,
      url: image.url,
      altText: image.alt_text,
    })),
  };
}

function mapProductCard(row: {
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
}): ProductCard {
  return {
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
  };
}

export type SellerProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  priceLak: string;
  stockQuantity: number;
  status: "draft" | "pending" | "approved" | "rejected" | "archived";
  rejectionReason: string | null;
};

export async function listSellerProducts(sellerProfileId: string): Promise<SellerProduct[]> {
  const result = await query<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    category_id: string;
    category_name: string;
    price_lak: string;
    stock_quantity: number;
    status: SellerProduct["status"];
    rejection_reason: string | null;
  }>(
    `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.description,
        p.category_id,
        c.name AS category_name,
        p.price_lak::text AS price_lak,
        p.stock_quantity,
        p.status,
        p.rejection_reason
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.seller_profile_id = $1
      ORDER BY p.updated_at DESC
    `,
    [sellerProfileId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    categoryId: row.category_id,
    categoryName: row.category_name,
    priceLak: row.price_lak,
    stockQuantity: row.stock_quantity,
    status: row.status,
    rejectionReason: row.rejection_reason,
  }));
}

export async function findSellerProduct(
  sellerProfileId: string,
  productId: string
): Promise<SellerProduct | null> {
  const products = await listSellerProducts(sellerProfileId);
  return products.find((product) => product.id === productId) ?? null;
}
