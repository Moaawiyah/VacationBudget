import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/types";

export function loginSchema(t: Dictionary["validation"]) {
  return z.object({
    email: z.email(t.emailInvalid),
    password: z.string().min(1, t.passwordRequired),
  });
}

export type LoginInput = z.infer<ReturnType<typeof loginSchema>>;

export function registerSchema(t: Dictionary["validation"]) {
  return z.object({
    email: z.email(t.emailInvalid),
    password: z.string().min(8, t.passwordMin8),
  });
}

export type RegisterInput = z.infer<ReturnType<typeof registerSchema>>;
