import { z } from "zod";

export const checkoutSchema = z.object({
  label: z.string().trim().min(2).max(50),
  recipientName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(6).max(30),
  addressLine1: z.string().trim().min(5).max(255),
  addressLine2: z.string().trim().max(255).optional().or(z.literal("")),
  province: z.string().trim().min(2).max(100),
  district: z.string().trim().max(100).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
});
