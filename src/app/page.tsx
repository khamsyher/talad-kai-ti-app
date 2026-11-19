import Link from "next/link";
import { auth } from "@/lib/auth";
import { signOutAction } from "@/modules/auth/signout.action";
import { listActiveCategories } from "@/modules/categories/category.repository";
import { searchApprovedProducts } from "@/modules/products/product.repository";
import { ProductCard } from "@/components/product/ProductCard";

export const instant = false;

type HomeProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    min?: string;
    max?: string;
    sort?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const session = await auth();
  const params = await searchParams;
  const categories = await listActiveCategories();
  const products = await searchApprovedProducts({
    query: params.q?.trim() || undefined,
    category: params.category || undefined,
    minPriceLak: toPositiveInteger(params.min),
    maxPriceLak: toPositiveInteger(params.max),
    sort:
      params.sort === "price_asc" || params.sort === "price_desc"
        ? params.sort
        : "newest",
  });

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-emerald-800">
            Talad Kai Ti
          </Link>
          {session ? (
            <div className="flex items-center gap-3">
              <Link href="/cart" className="text-sm underline">Cart</Link>
              <Link href="/orders" className="text-sm underline">Orders</Link>
              <span className="text-sm text-zinc-600">
                {session.user.name ?? session.user.email}
              </span>
              <form action={signOutAction}>
                <button type="submit" className="rounded border px-3 py-1.5 text-sm">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link href="/login" className="rounded border px-3 py-1.5 text-sm">Login</Link>
              <Link href="/register" className="rounded bg-emerald-700 px-3 py-1.5 text-sm text-white">Register</Link>
            </div>
          )}
        </div>
      </header>

      <section className="bg-emerald-800 px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-emerald-100">ຕະຫຼາດອອນໄລນ໌ປະເທດລາວ</p>
          <h1 className="mt-2 text-3xl font-bold">ຕະຫຼາດໄກ່ຕີ</h1>
          <form action="/" className="mt-6 grid gap-3 rounded-xl bg-white p-3 md:grid-cols-[1fr_180px_140px_140px_160px]">
            <input name="q" defaultValue={params.q ?? ""} placeholder="Search products" className="rounded border px-3 py-2 text-zinc-900" />
            <select name="category" defaultValue={params.category ?? ""} className="rounded border px-3 py-2 text-zinc-900">
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>{category.name}</option>
              ))}
            </select>
            <input name="min" type="number" min="0" defaultValue={params.min ?? ""} placeholder="Min LAK" className="rounded border px-3 py-2 text-zinc-900" />
            <input name="max" type="number" min="0" defaultValue={params.max ?? ""} placeholder="Max LAK" className="rounded border px-3 py-2 text-zinc-900" />
            <button type="submit" className="rounded bg-amber-400 px-4 py-2 font-semibold text-zinc-900">Search</button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Products</h2>
          <form>
            {Object.entries(params).map(([key, value]) =>
              key !== "sort" && value ? <input key={key} type="hidden" name={key} value={value} /> : null
            )}
            <select name="sort" defaultValue={params.sort ?? "newest"} className="rounded border bg-white px-3 py-2">
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
            <button type="submit" className="mt-3 rounded bg-emerald-700 px-3 py-2 text-sm text-white">
              Apply
            </button>
          </form>
        </div>
        {products.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="rounded-xl border bg-white p-10 text-center text-zinc-600">
            No approved products match these filters.
          </div>
        )}
      </section>
    </main>
  );
}

function toPositiveInteger(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}
