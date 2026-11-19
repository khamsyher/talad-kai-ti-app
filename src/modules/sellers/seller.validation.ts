import { z } from "zod";

export const sellerRegistrationSchema = z.object({
  shopName: z.string().trim().min(2).max(150),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  logoUrl: z.url().optional().or(z.literal("")),
  coverUrl: z.url().optional().or(z.literal("")),
});
