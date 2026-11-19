import { z } from "zod";

export const sellerModerationSchema = z.object({
  status: z.enum(["approved", "rejected", "suspended"]),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export const productModerationSchema = z.object({
  status: z.enum(["approved", "rejected", "archived"]),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export const userStatusSchema = z.object({
  status: z.enum(["active", "inactive", "banned"]),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  sortOrder: z.coerce.number().int().min(0).max(100000),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
});
