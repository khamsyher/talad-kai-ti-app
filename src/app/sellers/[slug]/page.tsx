import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product/ProductCard";
import {
  findApprovedSellerBySlug,
  listApprovedSellerProducts,
} from "@/modules/sellers/seller.repository";

export const instant = false;

type SellerPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: SellerPageProps): Promise<Metadata> {
  const { slug } = await params;
  const seller = await findApprovedSellerBySlug(slug);
  return seller
    ? { title: seller.shopName, description: seller.description ?? undefined }
    : { title: "Seller not found" };
}

export default async function SellerPage({ params }: SellerPageProps) {
  const { slug } = await params;
  const seller = await findApprovedSellerBySlug(slug);
  if (!seller) {
    notFound();
  }
  const products = await listApprovedSellerProducts(seller.id);

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <Link href="/" className="font-bold text-emerald-800">Talad Kai Ti</Link>
        </div>
      </header>
      <section className="bg-emerald-800 px-6 py-12 text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-5">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white bg-emerald-100 text-2xl font-bold text-emerald-800">
            {seller.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={seller.logoUrl} alt={seller.shopName} className="h-full w-full rounded-full object-cover" />
            ) : (
              seller.shopName.slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{seller.shopName}</h1>
            {seller.description && <p className="mt-2 max-w-2xl text-emerald-100">{seller.description}</p>}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="mb-6 text-2xl font-bold">Shop products</h2>
        {products.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="rounded-xl border bg-white p-10 text-center text-zinc-600">
            This seller has no currently available approved products.
          </div>
        )}
      </section>
    </main>
  );
}
