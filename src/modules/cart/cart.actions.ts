"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { cartQuantitySchema } from "./cart.validation";
import { addCartItem, removeCartItem, updateCartItem } from "./cart.service";

export async function addToCartAction(productId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) redirect("/login");

  const parsed = cartQuantitySchema.safeParse({
    productId,
    quantity: formData.get("quantity") ?? 1,
  });
  if (!parsed.success) return;

  await addCartItem(session.user.id, parsed.data.productId, parsed.data.quantity);
  revalidatePath("/cart");
  redirect("/cart");
}

export async function updateCartItemAction(productId: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) redirect("/login");

  const parsed = cartQuantitySchema.safeParse({
    productId,
    quantity: formData.get("quantity") ?? 1,
  });
  if (!parsed.success) return;

  await updateCartItem(session.user.id, parsed.data.productId, parsed.data.quantity);
  revalidatePath("/cart");
}

export async function removeCartItemAction(productId: string): Promise<void> {
  const session = await auth();
  if (!session) redirect("/login");

  await removeCartItem(session.user.id, productId);
  revalidatePath("/cart");
}
