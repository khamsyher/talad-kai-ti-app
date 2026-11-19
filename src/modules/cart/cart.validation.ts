import { z } from "zod";

export const cartQuantitySchema = z.object({
  productId: z.uuid(),
  quantity: z.coerce.number().int().min(1).max(100),
});
