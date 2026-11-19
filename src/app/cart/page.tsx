import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCartItems } from "@/modules/cart/cart.repository";
import {
  removeCartItemAction,
  updateCartItemAction,
} from "@/modules/cart/cart.actions";
import { formatLak } from "@/lib/format";

export const instant = false;

export default async function CartPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const items = await getCartItems(session.user.id);
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.priceLak) * item.quantity,
    0
  );

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Shopping cart</h1>
          <Link href="/" className="text-sm underline">Continue shopping</Link>
        </div>
        {items.length ? (
          <div className="mt-8 grid gap-6 md:grid-cols-[1fr_280px]">
            <div className="grid gap-3">
              {items.map((item) => (
                <article key={item.productId} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-4">
                  <div>
                    <Link href={`/products/${item.slug}`} className="font-semibold underline">{item.name}</Link>
                    <p className="text-sm text-zinc-600">{item.sellerName}</p>
                    <p className="mt-1 font-semibold text-emerald-700">{formatLak(item.priceLak)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={updateCartItemAction.bind(null, item.productId)} className="flex gap-2">
                      <input
                        name="quantity"
                        type="number"
                        min="1"
                        max={Math.min(item.stockQuantity, 100)}
                        defaultValue={item.quantity}
                        className="w-20 rounded border px-2 py-2"
                      />
                      <button type="submit" className="rounded border px-3 py-2 text-sm">Update</button>
                    </form>
                    <form action={removeCartItemAction.bind(null, item.productId)}>
                      <button type="submit" className="rounded border border-red-300 px-3 py-2 text-sm text-red-700">Remove</button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
            <aside className="h-fit rounded-xl border bg-white p-5">
              <p className="text-sm text-zinc-500">Subtotal</p>
              <p className="mt-2 text-2xl font-bold">{formatLak(subtotal)}</p>
              <p className="mt-2 text-xs text-zinc-500">Customer fee: 0 LAK</p>
              <Link href="/checkout" className="mt-5 block rounded bg-emerald-700 px-4 py-3 text-center text-white">
                Proceed to checkout
              </Link>
            </aside>
          </div>
        ) : (
          <div className="mt-8 rounded-xl border bg-white p-10 text-center text-zinc-600">
            Your cart is empty.
          </div>
        )}
      </div>
    </main>
  );
}
