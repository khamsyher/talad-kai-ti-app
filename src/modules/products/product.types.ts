export type ProductCard = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceLak: string;
  stockQuantity: number;
  categoryName: string;
  categorySlug: string;
  sellerName: string;
  sellerSlug: string;
  imageUrl: string | null;
};

export type ProductDetail = ProductCard & {
  sellerDescription: string | null;
  sellerLogoUrl: string | null;
  sellerCoverUrl: string | null;
  images: Array<{ id: string; url: string; altText: string | null }>;
};

export type ProductFilters = {
  query?: string;
  category?: string;
  minPriceLak?: number;
  maxPriceLak?: number;
  sort?: "newest" | "price_asc" | "price_desc";
};
