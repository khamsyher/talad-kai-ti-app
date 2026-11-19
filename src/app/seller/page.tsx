import Link from "next/link";
import { requireSeller } from "@/modules/auth/require-seller";
import { registerSellerFormAction } from "@/modules/sellers/seller.actions";
import {
  archiveProductAction,
  submitProductAction,
} from "@/modules/products/product.actions";
import { listSellerProducts } from "@/modules/products/product.repository";
import { listActiveCategories } from "@/modules/categories/category.repository";
import {
  getSellerSalesSummary,
  listSellerOrders,
} from "@/modules/seller-orders/seller-order.repository";
import { updateSellerOrderStatusFormAction } from "@/modules/seller-orders/seller-order.actions";
import { createProductFormAction } from "@/modules/products/product.actions";
import { formatLak } from "@/lib/format";
import { listSellerIdentityDocuments } from "@/modules/sellers/identity-verification.repository";
import { uploadIdentityDocumentAction } from "@/modules/sellers/identity-verification.actions";

export const instant = false;

export default async function SellerPage() {
  const { seller } = await requireSeller();

  if (!seller) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-10">
        <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-6">
          <h1 className="text-3xl font-bold">Register your shop</h1>
          <p className="mt-2 text-zinc-600">
            Submission creates a pending seller profile for verification.
          </p>
          <form action={registerSellerFormAction} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Shop name
              <input name="shopName" required minLength={2} className="rounded border px-3 py-2" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Shop slug
              <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className="rounded border px-3 py-2" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Description
              <textarea name="description" rows={4} className="rounded border px-3 py-2" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Logo URL
              <input name="logoUrl" type="url" className="rounded border px-3 py-2" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Cover URL
              <input name="coverUrl" type="url" className="rounded border px-3 py-2" />
            </label>
            <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-white">
              Submit for approval
            </button>
          </form>
        </div>
      </main>
    );
  }

  const [products, categories, summary, orders, identityDocuments] = await Promise.all([
    listSellerProducts(seller.id),
    listActiveCategories(),
    getSellerSalesSummary(seller.id),
    listSellerOrders(seller.id),
    listSellerIdentityDocuments(seller.id),
  ]);

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs text-zinc-500">Seller dashboard</p>
            <h1 className="text-xl font-bold">{seller.shopName}</h1>
          </div>
          <div className="flex gap-3">
            <Link href={`/sellers/${seller.slug}`} className="text-sm underline">View shop</Link>
            <Link href="/seller/wallet" className="text-sm underline">Wallet</Link>
            <Link href="/" className="text-sm underline">Marketplace</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        {seller.status !== "approved" && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
            Shop status: <strong>{seller.status}</strong>. Product moderation is required before listing.
          </div>
        )}

        <section className="mb-8 grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="rounded-xl border bg-white p-5">
            <h2 className="text-lg font-bold">Identity verification</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Status: <strong>{seller.identityStatus}</strong>
            </p>
            {seller.identityRejectionReason && (
              <p className="mt-2 text-sm text-red-700">
                {seller.identityRejectionReason}
              </p>
            )}
            {seller.identityStatus !== "approved" && (
              <form action={uploadIdentityDocumentAction} encType="multipart/form-data" className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr_auto]">
                <select name="documentType" required className="rounded border px-3 py-2">
                  <option value="national_id">National ID</option>
                  <option value="passport">Passport</option>
                  <option value="business_license">Business license</option>
                  <option value="bank_statement">Bank statement</option>
                  <option value="other">Other</option>
                </select>
                <input name="document" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" required className="text-sm" />
                <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-white">
                  Upload
                </button>
              </form>
            )}
            {identityDocuments.length > 0 && (
              <div className="mt-5 grid gap-2">
                {identityDocuments.map((document) => (
                  <a
                    key={document.id}
                    href={`/api/seller-documents/${document.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex justify-between rounded border px-3 py-2 text-sm"
                  >
                    <span>{document.documentType} · {document.originalName}</span>
                    <strong>{document.status}</strong>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard label="Products" value={summary.product_count} />
          <SummaryCard label="Approved" value={summary.approved_count} />
          <SummaryCard label="Orders" value={summary.order_count} />
          <SummaryCard label="Completed sales" value={formatLak(summary.completed_sales_lak)} />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[320px_1fr]">
          <section className="h-fit rounded-xl border bg-white p-5">
            <h2 className="text-lg font-bold">Add product</h2>
            {seller.status !== "approved" || seller.identityStatus !== "approved" ? (
              <p className="mt-3 rounded bg-amber-50 p-3 text-sm text-amber-900">
                Product posting is locked until the shop and identity documents are approved.
              </p>
            ) : (
            <form action={createProductFormAction} className="mt-4 grid gap-3">
              <input name="name" required placeholder="Product name" className="rounded border px-3 py-2" />
              <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="product-slug" className="rounded border px-3 py-2" />
              <select name="categoryId" required className="rounded border px-3 py-2">
                <option value="">Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              <textarea name="description" rows={3} placeholder="Description" className="rounded border px-3 py-2" />
              <input name="priceLak" type="number" min="0" required placeholder="Price (LAK)" className="rounded border px-3 py-2" />
              <input name="stockQuantity" type="number" min="0" required placeholder="Stock" className="rounded border px-3 py-2" />
              <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-white">Create</button>
            </form>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-lg font-bold">Products</h2>
            <div className="grid gap-3">
              {products.map((product) => (
                <article key={product.id} className="rounded-xl border bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-sm text-zinc-600">
                        {product.categoryName} · {formatLak(product.priceLak)} · stock {product.stockQuantity}
                      </p>
                      <p className="mt-1 text-xs uppercase text-zinc-500">{product.status}</p>
                      {product.rejectionReason && (
                        <p className="mt-1 text-sm text-red-700">{product.rejectionReason}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/seller/products/${product.id}/edit`} className="rounded border px-3 py-1.5 text-sm">
                        Edit
                      </Link>
                      {product.status !== "archived" && (
                        <form action={archiveProductAction.bind(null, product.id)}>
                          <button type="submit" className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700">
                            Archive
                          </button>
                        </form>
                      )}
                      {(product.status === "draft" || product.status === "rejected") && (
                        <form action={submitProductAction.bind(null, product.id)}>
                          <button type="submit" className="rounded border px-3 py-1.5 text-sm">
                            Submit
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold">Orders</h2>
          <div className="grid gap-3">
            {orders.length ? orders.map((order) => (
              <article key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
                <div>
                  <p className="font-semibold">{order.orderNumber}</p>
                  <p className="text-sm text-zinc-600">{formatLak(order.subtotalLak)}</p>
                </div>
                <form action={updateSellerOrderStatusFormAction.bind(null, order.id)} className="flex items-center gap-2">
                  <select name="status" defaultValue={order.status} className="rounded border px-3 py-2">
                    {["pending", "confirmed", "processing", "shipped", "completed", "cancelled", "refunded", "disputed"].map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <button type="submit" className="rounded bg-zinc-900 px-3 py-2 text-sm text-white">Update</button>
                </form>
              </article>
            )) : (
              <p className="rounded-xl border bg-white p-6 text-zinc-600">No seller orders yet.</p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
