import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCartItems } from "@/modules/cart/cart.repository";
import { checkoutAction } from "@/modules/orders/order.actions";
import { formatLak } from "@/lib/format";

export const instant = false;

export default async function CheckoutPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const items = await getCartItems(session.user.id);
  if (!items.length) redirect("/cart");

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.priceLak) * item.quantity,
    0
  );

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border bg-white p-6">
          <h1 className="text-2xl font-bold">Shipping details</h1>
          <form action={checkoutAction} className="mt-6 grid gap-4">
            <input name="label" required minLength={2} placeholder="Address label" className="rounded border px-3 py-2" />
            <input name="recipientName" required minLength={2} placeholder="Recipient name" className="rounded border px-3 py-2" />
            <input name="phone" required minLength={6} placeholder="Phone number" className="rounded border px-3 py-2" />
            <input name="addressLine1" required minLength={5} placeholder="Address line 1" className="rounded border px-3 py-2" />
            <input name="addressLine2" placeholder="Address line 2" className="rounded border px-3 py-2" />
            <input name="province" required minLength={2} placeholder="Province" className="rounded border px-3 py-2" />
            <input name="district" placeholder="District" className="rounded border px-3 py-2" />
            <input name="postalCode" placeholder="Postal code" className="rounded border px-3 py-2" />
            <button type="submit" className="rounded bg-emerald-700 px-4 py-3 text-white">Place order</button>
          </form>
        </section>
        <aside className="h-fit rounded-2xl border bg-white p-5">
          <h2 className="font-bold">Order summary</h2>
          <div className="mt-4 grid gap-3">
            {items.map((item) => (
              <div key={item.productId} className="flex justify-between gap-3 text-sm">
                <span>{item.quantity} × {item.name}</span>
                <span>{formatLak(Number(item.priceLak) * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-between border-t pt-4">
            <span>Total</span>
            <strong>{formatLak(subtotal)}</strong>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Payment status starts pending. No external payment provider is configured in this phase.
          </p>
          <Link href="/cart" className="mt-4 block text-sm underline">Back to cart</Link>
        </aside>
      </div>
    </main>
  );
}
