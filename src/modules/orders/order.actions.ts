"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { checkoutSchema } from "./order.validation";
import { createCustomerOrder } from "./order.service";

export async function checkoutAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) redirect("/login");

  const parsed = checkoutSchema.safeParse({
    label: formData.get("label"),
    recipientName: formData.get("recipientName"),
    phone: formData.get("phone"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2"),
    province: formData.get("province"),
    district: formData.get("district"),
    postalCode: formData.get("postalCode"),
  });
  if (!parsed.success) redirect("/checkout");

  try {
    const order = await createCustomerOrder(session.user.id, parsed.data);
    redirect(`/orders/${order.orderId}`);
  } catch {
    redirect("/checkout");
  }
}
