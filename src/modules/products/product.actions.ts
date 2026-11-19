"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { findSellerByUserId } from "@/modules/sellers/seller.repository";
import {
  createSellerProduct,
  setSellerProductStatus,
  updateSellerProduct,
} from "./product.service";
import { productCreateSchema } from "./product.validation";

async function getSellerProfileIdForAction() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }
  if (session.user.role !== "seller" && session.user.role !== "administrator") {
    redirect("/");
  }
  const seller = await findSellerByUserId(session.user.id);
  if (!seller) {
    redirect("/seller");
  }
  if (
    seller.status !== "approved" ||
    seller.identityStatus !== "approved"
  ) {
    redirect("/seller");
  }
  return seller.id;
}

export async function createProductAction(formData: FormData) {
  const sellerProfileId = await getSellerProfileIdForAction();
  const parsed = productCreateSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    priceLak: formData.get("priceLak"),
    stockQuantity: formData.get("stockQuantity"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid product information." };
  }

  try {
    await createSellerProduct(sellerProfileId, parsed.data);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return { error: "This product slug is already in use." };
    }
    return { error: "Unable to create product." };
  }

  revalidatePath("/seller");
  redirect("/seller");
}

export async function updateProductAction(productId: string, formData: FormData) {
  const sellerProfileId = await getSellerProfileIdForAction();
  const parsed = productCreateSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    priceLak: formData.get("priceLak"),
    stockQuantity: formData.get("stockQuantity"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid product information." };
  }

  const updated = await updateSellerProduct(sellerProfileId, productId, parsed.data);
  if (!updated) {
    return { error: "Product not found or access denied." };
  }

  revalidatePath("/seller");
  redirect("/seller");
}

export async function archiveProductAction(productId: string) {
  const sellerProfileId = await getSellerProfileIdForAction();
  await setSellerProductStatus(sellerProfileId, productId, "archived");
  revalidatePath("/seller");
}

export async function submitProductAction(productId: string) {
  const sellerProfileId = await getSellerProfileIdForAction();
  await setSellerProductStatus(sellerProfileId, productId, "pending");
  revalidatePath("/seller");
}

export async function createProductFormAction(formData: FormData): Promise<void> {
  await createProductAction(formData);
}

export async function updateProductFormAction(
  productId: string,
  formData: FormData
): Promise<void> {
  await updateProductAction(productId, formData);
}
