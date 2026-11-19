"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import {
  creditCommissionToWallet,
  markCommissionAvailable,
} from "./commission.service";

const ruleSchema = z.object({
  name: z.string().trim().min(2).max(150),
  commissionBps: z.coerce.number().int().min(0).max(10000),
});

export async function setPlatformCommissionAction(
  formData: FormData
): Promise<void> {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "administrator") redirect("/");

  const parsed = ruleSchema.safeParse({
    name: formData.get("name"),
    commissionBps: formData.get("commissionBps"),
  });
  if (!parsed.success) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
        UPDATE commission_rules
        SET is_active = FALSE, updated_at = NOW()
        WHERE scope = 'platform' AND is_active = TRUE
      `
    );
    await client.query(
      `
        INSERT INTO commission_rules (
          name,
          scope,
          commission_bps,
          is_active,
          valid_from
        )
        VALUES ($1, 'platform', $2, TRUE, NOW())
      `,
      [parsed.data.name, parsed.data.commissionBps]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  revalidatePath("/admin");
}

export async function markCommissionAvailableAction(
  commissionId: string
): Promise<void> {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "administrator") redirect("/");

  await markCommissionAvailable(commissionId);
  revalidatePath("/admin");
}

export async function creditCommissionAction(
  commissionId: string
): Promise<void> {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "administrator") redirect("/");

  await creditCommissionToWallet(commissionId);
  revalidatePath("/admin");
  revalidatePath("/seller");
  revalidatePath("/seller/wallet");
}
