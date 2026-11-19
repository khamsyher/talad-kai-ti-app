"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { sellerRegistrationSchema } from "./seller.validation";
import { registerSeller } from "./seller.service";

export async function registerSellerAction(
  _previousState: { error?: string } | null,
  formData: FormData
) {
  const session = await auth();
  if (!session) {
    return { error: "Please login first." };
  }

  const parsed = sellerRegistrationSchema.safeParse({
    shopName: formData.get("shopName"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    logoUrl: formData.get("logoUrl"),
    coverUrl: formData.get("coverUrl"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid seller information." };
  }

  try {
    await registerSeller(session.user.id, parsed.data);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return { error: "This shop name or slug is already in use." };
    }
    return { error: "Unable to submit seller registration." };
  }

  revalidatePath("/seller");
  return { ok: true as const };
}

export async function registerSellerFormAction(formData: FormData) {
  await registerSellerAction(null, formData);
  revalidatePath("/seller");
}
