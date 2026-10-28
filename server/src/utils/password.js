import { z } from "zod";

// bcrypt silently truncates input after 72 bytes, including multi-byte characters.
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 bytes")
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password must be at most 72 bytes");
