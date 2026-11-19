import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatLak } from "@/lib/format";
import { findApprovedProductBySlug } from "@/modules/products/product.repository";
import { addToCartAction } from "@/modules/cart/cart.actions";

export const instant = false;

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await findApprovedProductBySlug(slug);
  return product
    ? { title: product.name, description: product.description ?? undefined }
    : { title: "Product not found" };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await findApprovedProductBySlug(slug);
  if (!product) {
    notFound();
  }

  const primaryImage = product.images[0]?.url ?? product.imageUrl;

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <Link href="/" className="font-bold text-emerald-800">Talad Kai Ti</Link>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-10 md:grid-cols-[1fr_1fr]">
        <div className="flex min-h-96 items-center justify-center overflow-hidden rounded-2xl bg-emerald-50">
          {primaryImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={primaryImage} alt={product.name} className="h-full max-h-[560px] w-full object-cover" />
          ) : (
            <span className="text-7xl font-bold text-emerald-700" aria-hidden="true">KT</span>
          )}
        </div>
        <div>
          <Link href={`/?category=${product.categorySlug}`} className="text-sm text-emerald-700 underline">
            {product.categoryName}
          </Link>
          <h1 className="mt-2 text-3xl font-bold">{product.name}</h1>
          <p className="mt-4 text-2xl font-bold text-emerald-700">{formatLak(product.priceLak)}</p>
          <p className="mt-3 text-sm text-zinc-600">
            {product.stockQuantity > 0 ? `${product.stockQuantity} available` : "Out of stock"}
          </p>
          <p className="mt-6 whitespace-pre-line leading-7 text-zinc-700">
            {product.description ?? "No description provided."}
          </p>
          <div className="mt-8 rounded-xl border bg-white p-5">
            <p className="text-sm text-zinc-500">Seller</p>
            <Link href={`/sellers/${product.sellerSlug}`} className="mt-1 block font-semibold underline">
              {product.sellerName}
            </Link>
            {product.sellerDescription && (
              <p className="mt-3 text-sm text-zinc-600">{product.sellerDescription}</p>
            )}
          </div>
          {product.stockQuantity > 0 && (
            <form action={addToCartAction.bind(null, product.id)} className="mt-5 flex gap-3">
              <input
                name="quantity"
                type="number"
                min="1"
                max={Math.min(product.stockQuantity, 100)}
                defaultValue="1"
                className="w-24 rounded border px-3 py-3"
              />
              <button type="submit" className="rounded bg-emerald-700 px-5 py-3 text-white">
                Add to cart
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
