import Link from "next/link";
import { formatLak } from "@/lib/format";
import type { ProductCard as ProductCardType } from "@/modules/products/product.types";

export function ProductCard({ product }: { product: ProductCardType }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="flex h-44 items-center justify-center bg-emerald-50 text-emerald-700">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-5xl" aria-hidden="true">KT</span>
          )}
        </div>
        <div className="p-4">
          <p className="text-xs text-zinc-500">{product.categoryName}</p>
          <h2 className="mt-1 line-clamp-2 font-semibold">{product.name}</h2>
          <p className="mt-3 text-lg font-bold text-emerald-700">
            {formatLak(product.priceLak)}
          </p>
        </div>
      </Link>
      <div className="px-4 pb-4">
        <Link
          href={`/sellers/${product.sellerSlug}`}
          className="text-sm text-zinc-600 underline"
        >
          {product.sellerName}
        </Link>
      </div>
    </article>
  );
}
