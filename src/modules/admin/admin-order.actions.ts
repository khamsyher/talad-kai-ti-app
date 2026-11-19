"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

const orderStatusSchema = z.enum([
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "completed",
  "cancelled",
  "refunded",
  "disputed",
]);

export async function updateAdminOrderStatusAction(
  orderId: string,
  formData: FormData
): Promise<void> {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "administrator") redirect("/");

  const parsed = orderStatusSchema.safeParse(formData.get("status"));
  if (!parsed.success) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
        UPDATE orders
        SET status = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [orderId, parsed.data]
    );
    await client.query(
      `
        UPDATE seller_orders
        SET status = $2, updated_at = NOW()
        WHERE order_id = $1
      `,
      [orderId, parsed.data]
    );
    await client.query(
      `
        INSERT INTO audit_logs (
          actor_id,
          action,
          entity_type,
          entity_id,
          metadata
        )
        VALUES ($1, 'order.status_changed', 'order', $2, $3::jsonb)
      `,
      [
        session.user.id,
        orderId,
        JSON.stringify({ status: parsed.data }),
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
