import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { formatLak } from "@/lib/format";
import {
  listAdminCategories,
  listAdminOrders,
  listAdminProducts,
  listAdminSellers,
  listAdminUsers,
  getAdminReport,
  listPlatformSettings,
  listAdminVerificationDocuments,
} from "@/modules/admin/admin.repository";
import {
  createCategoryAction,
  moderateProductAction,
  moderateSellerAction,
  setCategoryStatusAction,
  setPlatformSettingAction,
  setUserStatusAction,
  moderateIdentityDocumentAction,
} from "@/modules/admin/admin.actions";
import { updateAdminOrderStatusAction } from "@/modules/admin/admin-order.actions";
import {
  listCommissionRules,
  listCommissionTransactions,
} from "@/modules/commissions/commission.repository";
import {
  creditCommissionAction,
  markCommissionAvailableAction,
  setPlatformCommissionAction,
} from "@/modules/commissions/commission.actions";
import { listPayouts } from "@/modules/payouts/payout.repository";
import {
  approvePayoutAction,
  rejectPayoutAction,
} from "@/modules/payouts/payout.actions";

export const instant = false;

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "administrator") redirect("/");

  const [
    users,
    sellers,
    products,
    orders,
    categories,
    report,
    settings,
    rules,
    commissions,
    payouts,
    verificationDocuments,
  ] = await Promise.all([
    listAdminUsers(),
    listAdminSellers(),
    listAdminProducts(),
    listAdminOrders(),
    listAdminCategories(),
    getAdminReport(),
    listPlatformSettings(),
    listCommissionRules(),
    listCommissionTransactions(),
    listPayouts(),
    listAdminVerificationDocuments(),
  ]);

  const activePlatform = rules.find(
    (rule) => rule.scope === "platform" && rule.isActive
  );
  const settingValues = Object.fromEntries(
    settings.map((setting) => [setting.key, String(setting.value).replace(/^"|"$/g, "")])
  );

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-bold">Admin dashboard</h1>
          <Link href="/" className="text-sm underline">Marketplace</Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-8">
        <section>
          <h2 className="mb-4 text-lg font-bold">Reports</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <ReportCard label="Users" value={String(report.totalUsers)} />
            <ReportCard label="Approved sellers" value={String(report.totalSellers)} />
            <ReportCard label="Pending sellers" value={String(report.pendingSellers)} />
            <ReportCard label="Pending products" value={String(report.pendingProducts)} />
            <ReportCard label="Orders" value={String(report.totalOrders)} />
            <ReportCard label="Completed sales" value={formatLak(report.grossCompletedLak)} />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-bold">Seller verification</h2>
          <AdminList emptyText="No seller profiles.">
            {sellers.map((seller) => (
              <article key={seller.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
                <div>
                  <p className="font-semibold">{seller.shopName}</p>
                  <p className="text-sm text-zinc-600">{seller.slug} · {seller.status}</p>
                  {seller.rejectionReason && (
                    <p className="text-sm text-red-700">{seller.rejectionReason}</p>
                  )}
                </div>
                <form action={moderateSellerAction.bind(null, seller.id)} className="flex flex-wrap gap-2">
                  <select name="status" defaultValue={seller.status === "pending" ? "approved" : seller.status} className="rounded border px-3 py-2">
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                    <option value="suspended">suspended</option>
                  </select>
                  <input name="reason" placeholder="Rejection reason" className="w-44 rounded border px-3 py-2" />
                  <button type="submit" className="rounded bg-zinc-900 px-3 py-2 text-sm text-white">Apply</button>
                </form>
              </article>
            ))}
          </AdminList>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-bold">Identity documents</h2>
          <AdminList emptyText="No identity documents.">
            {verificationDocuments.map((document) => (
              <article key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
                <div>
                  <p className="font-semibold">{document.shopName}</p>
                  <p className="text-sm text-zinc-600">
                    {document.documentType} · {document.originalName} · {document.status}
                  </p>
                  {document.rejectionReason && (
                    <p className="text-sm text-red-700">{document.rejectionReason}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/api/seller-documents/${document.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border px-3 py-2 text-sm underline"
                  >
                    View private document
                  </a>
                  {document.status === "pending" && (
                    <form action={moderateIdentityDocumentAction.bind(null, document.id)} className="flex flex-wrap gap-2">
                      <select name="status" defaultValue="approved" className="rounded border px-3 py-2">
                        <option value="approved">approved</option>
                        <option value="rejected">rejected</option>
                      </select>
                      <input name="reason" placeholder="Rejection reason" className="w-44 rounded border px-3 py-2" />
                      <button type="submit" className="rounded bg-zinc-900 px-3 py-2 text-sm text-white">
                        Apply
                      </button>
                    </form>
                  )}
                </div>
              </article>
            ))}
          </AdminList>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-bold">Product moderation</h2>
          <AdminList emptyText="No products.">
            {products.map((product) => (
              <article key={product.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
                <div>
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-sm text-zinc-600">
                    {product.shopName} · {formatLak(product.priceLak)} · stock {product.stockQuantity} · {product.status}
                  </p>
                </div>
                <form action={moderateProductAction.bind(null, product.id)} className="flex flex-wrap gap-2">
                  <select name="status" defaultValue={product.status === "pending" ? "approved" : product.status} className="rounded border px-3 py-2">
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                    <option value="archived">archived</option>
                  </select>
                  <input name="reason" placeholder="Rejection reason" className="w-44 rounded border px-3 py-2" />
                  <button type="submit" className="rounded bg-zinc-900 px-3 py-2 text-sm text-white">Apply</button>
                </form>
              </article>
            ))}
          </AdminList>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-bold">Customer and staff management</h2>
          <AdminList emptyText="No users.">
            {users.map((user) => (
              <article key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
                <div>
                  <p className="font-semibold">{user.displayName}</p>
                  <p className="text-sm text-zinc-600">{user.email} · {user.role} · {user.status}</p>
                </div>
                {session.user.id !== user.id && (
                  <form action={setUserStatusAction.bind(null, user.id)} className="flex gap-2">
                    <select name="status" defaultValue={user.status} className="rounded border px-3 py-2">
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                      <option value="banned">banned</option>
                    </select>
                    <button type="submit" className="rounded border px-3 py-2 text-sm">Update</button>
                  </form>
                )}
              </article>
            ))}
          </AdminList>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-bold">Orders</h2>
          <AdminList emptyText="No orders.">
            {orders.map((order) => (
              <article key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
                <div>
                  <p className="font-semibold">{order.orderNumber}</p>
                  <p className="text-sm text-zinc-600">{order.customerEmail} · {formatLak(order.totalLak)} · {order.status}</p>
                </div>
                <form action={updateAdminOrderStatusAction.bind(null, order.id)} className="flex gap-2">
                  <select name="status" defaultValue={order.status} className="rounded border px-3 py-2">
                    {["pending", "confirmed", "processing", "shipped", "completed", "cancelled", "refunded", "disputed"].map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <button type="submit" className="rounded border px-3 py-2 text-sm">Update</button>
                </form>
              </article>
            ))}
          </AdminList>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-bold">Categories</h2>
          <div className="grid gap-6 md:grid-cols-[280px_1fr]">
            <form action={createCategoryAction} className="h-fit rounded-xl border bg-white p-5 grid gap-3">
              <input name="name" required placeholder="Category name" className="rounded border px-3 py-2" />
              <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="category-slug" className="rounded border px-3 py-2" />
              <input name="sortOrder" type="number" min="0" defaultValue="0" className="rounded border px-3 py-2" />
              <select name="isActive" defaultValue="true" className="rounded border px-3 py-2">
                <option value="true">active</option>
                <option value="false">inactive</option>
              </select>
              <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-white">Create category</button>
            </form>
            <AdminList emptyText="No categories.">
              {categories.map((category) => (
                <article key={category.id} className="flex items-center justify-between gap-3 rounded-xl border bg-white p-4">
                  <div>
                    <p className="font-semibold">{category.name}</p>
                    <p className="text-sm text-zinc-600">{category.slug} · order {category.sortOrder}</p>
                  </div>
                  <form action={setCategoryStatusAction.bind(null, category.id)} className="flex gap-2">
                    <select name="isActive" defaultValue={String(category.isActive)} className="rounded border px-3 py-2">
                      <option value="true">active</option>
                      <option value="false">inactive</option>
                    </select>
                    <button type="submit" className="rounded border px-3 py-2 text-sm">Update</button>
                  </form>
                </article>
              ))}
            </AdminList>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-bold">Platform commission</h2>
          <p className="mt-1 text-sm text-zinc-600">
            100 basis points = 1%.
            {activePlatform ? ` Current active rule: ${activePlatform.commissionBps} bps.` : " No active platform rule."}
          </p>
          <form action={setPlatformCommissionAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
            <input name="name" defaultValue="Configured platform commission" required className="rounded border px-3 py-2" />
            <input name="commissionBps" type="number" min="0" max="10000" defaultValue={activePlatform?.commissionBps ?? 0} required className="rounded border px-3 py-2" />
            <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-white">Update</button>
          </form>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-bold">Commission transactions</h2>
          <AdminList emptyText="No commission transactions.">
            {commissions.map((commission) => (
              <article key={commission.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
                <div>
                  <p className="font-semibold">{commission.shopName} · {commission.orderNumber}</p>
                  <p className="text-sm text-zinc-600">
                    Sale {formatLak(commission.orderAmountLak)} · {commission.commissionBps} bps · Commission {formatLak(commission.commissionAmountLak)}
                  </p>
                  <p className="text-xs uppercase text-zinc-500">{commission.status}</p>
                </div>
                {commission.status === "pending" && (
                  <form action={markCommissionAvailableAction.bind(null, commission.id)}>
                    <button type="submit" className="rounded border px-3 py-2 text-sm">Mark available</button>
                  </form>
                )}
                {commission.status === "available" && (
                  <form action={creditCommissionAction.bind(null, commission.id)}>
                    <button type="submit" className="rounded bg-emerald-700 px-3 py-2 text-sm text-white">Credit wallet</button>
                  </form>
                )}
              </article>
            ))}
          </AdminList>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-bold">Payout requests</h2>
          <AdminList emptyText="No payout requests.">
            {payouts.map((payout) => (
              <article key={payout.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
                <div>
                  <p className="font-semibold">{payout.shopName}</p>
                  <p className="text-sm text-zinc-600">{formatLak(payout.amountLak)} · {payout.status}</p>
                  {payout.bankName && (
                    <p className="text-sm text-zinc-500">{payout.bankName} · {payout.accountName} · {payout.accountNumber}</p>
                  )}
                </div>
                {payout.status === "pending" && (
                  <div className="grid gap-2">
                    <form action={approvePayoutAction.bind(null, payout.id)}>
                      <button type="submit" className="w-full rounded bg-emerald-700 px-3 py-2 text-sm text-white">Approve / paid</button>
                    </form>
                    <form action={rejectPayoutAction.bind(null, payout.id)} className="flex gap-2">
                      <input name="reason" required minLength={2} placeholder="Rejection reason" className="w-44 rounded border px-2 py-2 text-sm" />
                      <button type="submit" className="rounded border border-red-300 px-3 py-2 text-sm text-red-700">Reject</button>
                    </form>
                  </div>
                )}
              </article>
            ))}
          </AdminList>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-bold">Platform settings</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {([
              ["marketplace_name", "Marketplace name"],
              ["default_locale", "Default locale"],
              ["currency", "Currency"],
            ] as const).map(([key, label]) => (
              <form
                key={key}
                action={setPlatformSettingAction.bind(null, key)}
                className="rounded-xl border bg-white p-4"
              >
                <label className="grid gap-2 text-sm font-medium">
                  {label}
                  <input
                    name="value"
                    defaultValue={settingValues[key] ?? ""}
                    required
                    maxLength={100}
                    className="rounded border px-3 py-2"
                  />
                </label>
                <button type="submit" className="mt-3 rounded border px-3 py-2 text-sm">Save</button>
              </form>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function ReportCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-2 break-words text-xl font-bold">{value}</p>
    </div>
  );
}

function AdminList({
  emptyText,
  children,
}: {
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3">
      {Array.isArray(children) && children.length === 0 ? (
        <p className="rounded-xl border bg-white p-6 text-zinc-600">{emptyText}</p>
      ) : (
        children
      )}
    </div>
  );
}
