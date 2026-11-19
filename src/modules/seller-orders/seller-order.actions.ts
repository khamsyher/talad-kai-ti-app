"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { auth } from "@/lib/auth";
import { findSellerByUserId } from "@/modules/sellers/seller.repository";
import { z } from "zod";
import {
  createPendingCommission,
  reverseCommission,
} from "@/modules/commissions/commission.service";

const statusSchema = z.enum([
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "completed",
  "cancelled",
  "refunded",
  "disputed",
]);

export async function updateSellerOrderStatusAction(
  sellerOrderId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "seller" && session.user.role !== "administrator") {
    redirect("/");
  }

  const seller = await findSellerByUserId(session.user.id);
  if (!seller) redirect("/seller");

  const parsed = statusSchema.safeParse(formData.get("status"));
  if (!parsed.success) return { error: "Invalid order status." };

  const result = await pool.query(
    `
      UPDATE seller_orders
      SET status = $3, updated_at = NOW()
      WHERE id = $1
        AND seller_profile_id = $2
      RETURNING id
    `,
    [sellerOrderId, seller.id, parsed.data]
  );
  if (!result.rows[0]) return { error: "Order not found or access denied." };

  if (parsed.data === "completed") {
    await createPendingCommission(sellerOrderId);
  }
  if (parsed.data === "cancelled" || parsed.data === "refunded") {
    const commissionResult = await pool.query(
      "SELECT id FROM commission_transactions WHERE seller_order_id = $1",
      [sellerOrderId]
    );
    if (commissionResult.rows[0]) {
      await reverseCommission(
        commissionResult.rows[0].id,
        `Seller order status changed to ${parsed.data}`
      );
    }
  }

  revalidatePath("/seller");
  return { ok: true as const };
}

export async function updateSellerOrderStatusFormAction(
  sellerOrderId: string,
  formData: FormData
): Promise<void> {
  await updateSellerOrderStatusAction(sellerOrderId, formData);
}
