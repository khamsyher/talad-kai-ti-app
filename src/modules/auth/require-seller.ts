import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { findSellerByUserId } from "@/modules/sellers/seller.repository";

export async function requireSeller() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }
  if (session.user.role !== "seller" && session.user.role !== "administrator") {
    redirect("/");
  }

  const seller = await findSellerByUserId(session.user.id);
  return { session, seller };
}
