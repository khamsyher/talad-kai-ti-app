"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { findSellerByUserId } from "@/modules/sellers/seller.repository";
import {
  approvePayout,
  rejectPayout,
  requestPayout,
} from "./payout.service";

const payoutRequestSchema = z.object({
  amountLak: z.coerce.number().int().positive().max(1_000_000_000_000),
  bankName: z.string().trim().min(2).max(100),
  accountName: z.string().trim().min(2).max(100),
  accountNumber: z.string().trim().min(4).max(100),
});

export async function requestPayoutFormAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "seller" && session.user.role !== "administrator") {
    redirect("/");
  }

  const seller = await findSellerByUserId(session.user.id);
  if (!seller) redirect("/seller");

  const parsed = payoutRequestSchema.safeParse({
    amountLak: formData.get("amountLak"),
    bankName: formData.get("bankName"),
    accountName: formData.get("accountName"),
    accountNumber: formData.get("accountNumber"),
  });
  if (!parsed.success) return;

  try {
    await requestPayout(
      seller.id,
      parsed.data.amountLak,
      parsed.data.bankName,
      parsed.data.accountName,
      parsed.data.accountNumber
    );
  } catch {
    return;
  }

  revalidatePath("/seller/wallet");
  revalidatePath("/admin");
}

export async function approvePayoutAction(payoutId: string): Promise<void> {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "administrator") redirect("/");

  await approvePayout(payoutId);
  revalidatePath("/admin");
  revalidatePath("/seller/wallet");
}

export async function rejectPayoutAction(
  payoutId: string,
  formData: FormData
): Promise<void> {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "administrator") redirect("/");

  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 2) return;

  await rejectPayout(payoutId, reason);
  revalidatePath("/admin");
  revalidatePath("/seller/wallet");
}
