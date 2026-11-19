import { z } from "zod";

export const productCreateSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  categoryId: z.uuid(),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  priceLak: z.coerce.number().int().min(0).max(1_000_000_000_000),
  stockQuantity: z.coerce.number().int().min(0).max(10_000_000),
});

export const productUpdateSchema = productCreateSchema;
