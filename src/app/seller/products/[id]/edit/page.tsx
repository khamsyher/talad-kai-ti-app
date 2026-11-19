import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSeller } from "@/modules/auth/require-seller";
import { findSellerProduct } from "@/modules/products/product.repository";
import { updateProductFormAction } from "@/modules/products/product.actions";
import { listActiveCategories } from "@/modules/categories/category.repository";

export const instant = false;

type EditProductPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const { seller } = await requireSeller();
  if (!seller) {
    redirect("/seller");
  }
  if (seller.status !== "approved" || seller.identityStatus !== "approved") {
    redirect("/seller");
  }

  const [product, categories] = await Promise.all([
    findSellerProduct(seller.id, id),
    listActiveCategories(),
  ]);
  if (!product) {
    notFound();
  }

  const updateAction = updateProductFormAction.bind(null, product.id);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Edit product</h1>
          <Link href="/seller" className="text-sm underline">Back</Link>
        </div>
        <form action={updateAction} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-medium">
            Product name
            <input name="name" defaultValue={product.name} required minLength={2} className="rounded border px-3 py-2" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Slug
            <input name="slug" defaultValue={product.slug} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className="rounded border px-3 py-2" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Category
            <select name="categoryId" defaultValue={product.categoryId} required className="rounded border px-3 py-2">
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Description
            <textarea name="description" defaultValue={product.description ?? ""} rows={5} className="rounded border px-3 py-2" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Price (LAK)
            <input name="priceLak" type="number" min="0" defaultValue={product.priceLak} required className="rounded border px-3 py-2" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Stock quantity
            <input name="stockQuantity" type="number" min="0" defaultValue={product.stockQuantity} required className="rounded border px-3 py-2" />
          </label>
          <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-white">Save changes</button>
        </form>
      </div>
    </main>
  );
}
