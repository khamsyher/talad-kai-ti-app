import { query } from "@/lib/db";

export type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

export async function listActiveCategories(): Promise<Category[]> {
  const result = await query<{
    id: string;
    name: string;
    slug: string;
    parent_id: string | null;
  }>(
    `
      SELECT id, name, slug, parent_id
      FROM categories
      WHERE is_active = TRUE
      ORDER BY sort_order ASC, name ASC
    `
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parent_id,
  }));
}
