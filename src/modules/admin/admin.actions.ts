"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import {
  categorySchema,
  productModerationSchema,
  sellerModerationSchema,
  userStatusSchema,
} from "./admin.validation";

async function requireAdministrator() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "administrator") redirect("/");
  return session;
}

async function audit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {}
) {
  await pool.query(
    `
      INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
      VALUES ($1, $2, $3, $4, $5::jsonb)
    `,
    [actorId, action, entityType, entityId, JSON.stringify(metadata)]
  );
}

export async function moderateIdentityDocumentAction(
  documentId: string,
  formData: FormData
): Promise<void> {
  const session = await requireAdministrator();
  const status = formData.get("status");
  const reason = String(formData.get("reason") ?? "").trim();

  if (status !== "approved" && status !== "rejected") return;
  if (status === "rejected" && reason.length < 2) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const documentResult = await client.query(
      `
        SELECT seller_profile_id
        FROM seller_verification_documents
        WHERE id = $1
        FOR UPDATE
      `,
      [documentId]
    );
    const document = documentResult.rows[0];
    if (!document) {
      await client.query("ROLLBACK");
      return;
    }

    await client.query(
      `
        UPDATE seller_verification_documents
        SET status = $2,
            rejection_reason = CASE WHEN $2 = 'rejected' THEN $3 ELSE NULL END,
            reviewed_by = $4,
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
      `,
      [documentId, status, reason || null, session.user.id]
    );

    if (status === "approved") {
      await client.query(
        `
          UPDATE seller_profiles
          SET identity_status = 'approved',
              identity_rejection_reason = NULL,
              identity_verified_at = NOW(),
              updated_at = NOW()
          WHERE id = $1
        `,
        [document.seller_profile_id]
      );
    } else {
      await client.query(
        `
          UPDATE seller_profiles
          SET identity_status = 'rejected',
              identity_rejection_reason = $2,
              identity_verified_at = NULL,
              updated_at = NOW()
          WHERE id = $1
        `,
        [document.seller_profile_id, reason]
      );
    }

    await client.query(
      `
        INSERT INTO audit_logs (
          actor_id,
          action,
          entity_type,
          entity_id,
          metadata
        )
        VALUES ($1, 'seller_identity_document.moderated', 'seller_verification_document', $2, $3::jsonb)
      `,
      [
        session.user.id,
        documentId,
        JSON.stringify({ status, reason: status === "rejected" ? reason : null }),
      ]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  revalidatePath("/admin");
  revalidatePath("/seller");
}

export async function moderateSellerAction(
  sellerProfileId: string,
  formData: FormData
): Promise<void> {
  const session = await requireAdministrator();
  const parsed = sellerModerationSchema.safeParse({
    status: formData.get("status"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return;

  const result = await pool.query(
    `
      UPDATE seller_profiles
      SET status = $2,
          rejection_reason = CASE WHEN $2 = 'rejected' THEN NULLIF($3, '') ELSE NULL END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [sellerProfileId, parsed.data.status, parsed.data.reason ?? ""]
  );
  if (result.rows[0]) {
    await audit(
      session.user.id,
      "seller.moderated",
      "seller_profile",
      sellerProfileId,
      { status: parsed.data.status, reason: parsed.data.reason ?? null }
    );
  }
  revalidatePath("/admin");
  revalidatePath("/seller");
}

export async function moderateProductAction(
  productId: string,
  formData: FormData
): Promise<void> {
  const session = await requireAdministrator();
  const parsed = productModerationSchema.safeParse({
    status: formData.get("status"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return;

  const result = await pool.query(
    `
      UPDATE products
      SET status = $2,
          rejection_reason = CASE WHEN $2 = 'rejected' THEN NULLIF($3, '') ELSE NULL END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [productId, parsed.data.status, parsed.data.reason ?? ""]
  );
  if (result.rows[0]) {
    await audit(
      session.user.id,
      "product.moderated",
      "product",
      productId,
      { status: parsed.data.status, reason: parsed.data.reason ?? null }
    );
  }
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function setUserStatusAction(
  userId: string,
  formData: FormData
): Promise<void> {
  const session = await requireAdministrator();
  if (session.user.id === userId) return;

  const parsed = userStatusSchema.safeParse({
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const result = await pool.query(
    `
      UPDATE users
      SET status = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [userId, parsed.data.status]
  );
  if (result.rows[0]) {
    await audit(
      session.user.id,
      "user.status_changed",
      "user",
      userId,
      { status: parsed.data.status }
    );
  }
  revalidatePath("/admin");
}

export async function createCategoryAction(
  formData: FormData
): Promise<void> {
  const session = await requireAdministrator();
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") ?? "true",
  });
  if (!parsed.success) return;

  const result = await pool.query(
    `
      INSERT INTO categories (name, slug, sort_order, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
    [parsed.data.name, parsed.data.slug, parsed.data.sortOrder, parsed.data.isActive]
  );
  await audit(
    session.user.id,
    "category.created",
    "category",
    result.rows[0].id,
    { name: parsed.data.name, slug: parsed.data.slug }
  );
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function setCategoryStatusAction(
  categoryId: string,
  formData: FormData
): Promise<void> {
  const session = await requireAdministrator();
  const parsed = z
    .object({ isActive: z.enum(["true", "false"]).transform((value) => value === "true") })
    .safeParse({ isActive: formData.get("isActive") });
  if (!parsed.success) return;

  await pool.query(
    `
      UPDATE categories
      SET is_active = $2, updated_at = NOW()
      WHERE id = $1
    `,
    [categoryId, parsed.data.isActive]
  );
  await audit(
    session.user.id,
    "category.status_changed",
    "category",
    categoryId,
    { isActive: parsed.data.isActive }
  );
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function setPlatformSettingAction(
  key: "marketplace_name" | "default_locale" | "currency",
  formData: FormData
): Promise<void> {
  const session = await requireAdministrator();
  const rawValue = String(formData.get("value") ?? "").trim();
  if (!rawValue || rawValue.length > 100) return;

  await pool.query(
    `
      INSERT INTO platform_settings (key, value, updated_at)
      VALUES ($1, to_jsonb($2::text), NOW())
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = NOW()
    `,
    [key, rawValue]
  );
  await audit(
    session.user.id,
    "platform_setting.updated",
    "platform_setting",
    key,
    { key, value: rawValue }
  );
  revalidatePath("/admin");
}
