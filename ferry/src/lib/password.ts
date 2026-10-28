import { z } from "zod";

export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 bytes")
  .refine((value) => new TextEncoder().encode(value).length <= 72, "Password must be at most 72 bytes");
