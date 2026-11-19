import { query } from "@/lib/db";

export type AdminUser = {
  id: string;
  displayName: string;
  email: string;
  role: "customer" | "seller" | "administrator" | "delivery_staff";
  status: "active" | "inactive" | "banned";
  createdAt: Date;
};

export type AdminSeller = {
  id: string;
  userId: string;
  shopName: string;
  slug: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  rejectionReason: string | null;
  createdAt: Date;
};

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  status: "draft" | "pending" | "approved" | "rejected" | "archived";
  rejectionReason: string | null;
  priceLak: string;
  stockQuantity: number;
  shopName: string;
};

export type AdminOrder = {
  id: string;
  orderNumber: string;
  status: string;
  customerEmail: string;
  totalLak: string;
  createdAt: Date;
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type AdminVerificationDocument = {
  id: string;
  sellerProfileId: string;
  shopName: string;
  documentType: "national_id" | "passport" | "business_license" | "bank_statement" | "other";
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  createdAt: Date;
};

export type AdminReport = {
  totalUsers: number;
  totalSellers: number;
  pendingSellers: number;
  pendingProducts: number;
  totalOrders: number;
  grossCompletedLak: number;
};

export async function listAdminUsers(): Promise<AdminUser[]> {
  const result = await query<{
    id: string;
    display_name: string;
    email: string;
    role: AdminUser["role"];
    status: AdminUser["status"];
    created_at: Date;
  }>(
    `
      SELECT id, display_name, email, role, status, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 200
    `
  );
  return result.rows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function listAdminSellers(): Promise<AdminSeller[]> {
  const result = await query<{
    id: string;
    user_id: string;
    shop_name: string;
    slug: string;
    status: AdminSeller["status"];
    rejection_reason: string | null;
    created_at: Date;
  }>(
    `
      SELECT id, user_id, shop_name, slug, status,
             rejection_reason, created_at
      FROM seller_profiles
      ORDER BY created_at DESC
      LIMIT 200
    `
  );
  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    shopName: row.shop_name,
    slug: row.slug,
    status: row.status,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
  }));
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  const result = await query<{
    id: string;
    name: string;
    slug: string;
    status: AdminProduct["status"];
    rejection_reason: string | null;
    price_lak: string;
    stock_quantity: number;
    shop_name: string;
  }>(
    `
      SELECT p.id, p.name, p.slug, p.status, p.rejection_reason,
             p.price_lak::text AS price_lak,
             p.stock_quantity,
             sp.shop_name
      FROM products p
      JOIN seller_profiles sp ON sp.id = p.seller_profile_id
      ORDER BY p.updated_at DESC
      LIMIT 200
    `
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    rejectionReason: row.rejection_reason,
    priceLak: row.price_lak,
    stockQuantity: row.stock_quantity,
    shopName: row.shop_name,
  }));
}

export async function listAdminOrders(): Promise<AdminOrder[]> {
  const result = await query<{
    id: string;
    order_number: string;
    status: string;
    email: string;
    total_lak: string;
    created_at: Date;
  }>(
    `
      SELECT o.id, o.order_number, o.status, u.email,
             o.total_lak::text AS total_lak, o.created_at
      FROM orders o
      JOIN users u ON u.id = o.customer_id
      ORDER BY o.created_at DESC
      LIMIT 200
    `
  );
  return result.rows.map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    customerEmail: row.email,
    totalLak: row.total_lak,
    createdAt: row.created_at,
  }));
}

export async function listAdminCategories(): Promise<AdminCategory[]> {
  const result = await query<{
    id: string;
    name: string;
    slug: string;
    parent_id: string | null;
    sort_order: number;
    is_active: boolean;
  }>(
    `
      SELECT id, name, slug, parent_id, sort_order, is_active
      FROM categories
      ORDER BY sort_order ASC, name ASC
    `
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parent_id,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }));
}

export async function getAdminReport(): Promise<AdminReport> {
  const result = await query<{
    total_users: string;
    total_sellers: string;
    pending_sellers: string;
    pending_products: string;
    total_orders: string;
    gross_completed_lak: string;
  }>(
    `
      SELECT
        (SELECT COUNT(*) FROM users)::text AS total_users,
        (SELECT COUNT(*) FROM seller_profiles WHERE status = 'approved')::text AS total_sellers,
        (SELECT COUNT(*) FROM seller_profiles WHERE status = 'pending')::text AS pending_sellers,
        (SELECT COUNT(*) FROM products WHERE status = 'pending')::text AS pending_products,
        (SELECT COUNT(*) FROM orders)::text AS total_orders,
        (SELECT COALESCE(SUM(total_lak), 0) FROM orders WHERE status = 'completed')::text AS gross_completed_lak
    `
  );
  const row = result.rows[0];
  return {
    totalUsers: Number(row.total_users),
    totalSellers: Number(row.total_sellers),
    pendingSellers: Number(row.pending_sellers),
    pendingProducts: Number(row.pending_products),
    totalOrders: Number(row.total_orders),
    grossCompletedLak: Number(row.gross_completed_lak),
  };
}

export async function listPlatformSettings() {
  const result = await query<{ key: string; value: unknown }>(
    `
      SELECT key, value
      FROM platform_settings
      ORDER BY key ASC
    `
  );
  return result.rows;
}

export async function listAdminVerificationDocuments(): Promise<AdminVerificationDocument[]> {
  const result = await query<{
    id: string;
    seller_profile_id: string;
    shop_name: string;
    document_type: AdminVerificationDocument["documentType"];
    original_name: string;
    mime_type: string;
    size_bytes: number;
    status: AdminVerificationDocument["status"];
    rejection_reason: string | null;
    created_at: Date;
  }>(
    `
      SELECT d.id,
             d.seller_profile_id,
             sp.shop_name,
             d.document_type,
             d.original_name,
             d.mime_type,
             d.size_bytes,
             d.status,
             d.rejection_reason,
             d.created_at
      FROM seller_verification_documents d
      JOIN seller_profiles sp ON sp.id = d.seller_profile_id
      ORDER BY d.created_at DESC
      LIMIT 200
    `
  );

  return result.rows.map((row) => ({
    id: row.id,
    sellerProfileId: row.seller_profile_id,
    shopName: row.shop_name,
    documentType: row.document_type,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    status: row.status,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
  }));
}
