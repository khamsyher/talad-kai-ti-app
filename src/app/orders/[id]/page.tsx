import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { findCustomerOrder } from "@/modules/orders/order.repository";
import { formatLak } from "@/lib/format";

export const instant = false;

type OrderDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function OrderDetailPage({ params }: OrderDetailProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const order = await findCustomerOrder(session.user.id, id);
  if (!order) notFound();

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-2xl border bg-white p-6">
        <Link href="/orders" className="text-sm underline">Order history</Link>
        <h1 className="mt-4 text-3xl font-bold">{order.orderNumber}</h1>
        <p className="mt-2 text-zinc-600">Status: {order.status}</p>
        <p className="text-zinc-600">Payment: {order.paymentStatus ?? "unavailable"}</p>
        {order.address && (
          <div className="mt-6 rounded-xl border p-4">
            <p className="font-semibold">{order.address.recipientName}</p>
            <p className="text-sm text-zinc-600">{order.address.phone}</p>
            <p className="mt-2 text-sm">
              {order.address.addressLine1}
              {order.address.addressLine2 ? `, ${order.address.addressLine2}` : ""}
              {`, ${order.address.district ? `${order.address.district}, ` : ""}${order.address.province}`}
            </p>
          </div>
        )}
        <div className="mt-6 flex justify-between border-t pt-5">
          <span className="font-semibold">Total</span>
          <strong>{formatLak(order.totalLak)}</strong>
        </div>
      </div>
    </main>
  );
}
