import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listCustomerOrders } from "@/modules/orders/order.repository";
import { formatLak } from "@/lib/format";

export const instant = false;

export default async function OrdersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const orders = await listCustomerOrders(session.user.id);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Order history</h1>
          <Link href="/" className="text-sm underline">Marketplace</Link>
        </div>
        <div className="mt-8 grid gap-3">
          {orders.length ? orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="flex items-center justify-between rounded-xl border bg-white p-5"
            >
              <div>
                <p className="font-semibold">{order.orderNumber}</p>
                <p className="text-sm text-zinc-500">{order.status}</p>
              </div>
              <strong>{formatLak(order.totalLak)}</strong>
            </Link>
          )) : (
            <p className="rounded-xl border bg-white p-8 text-center text-zinc-600">No orders yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
