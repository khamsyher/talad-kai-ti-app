import { z } from "zod";

export const registrationSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  email: z.email().trim().toLowerCase(),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  password: z
    .string()
    .min(12)
    .max(128)
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(128),
});
