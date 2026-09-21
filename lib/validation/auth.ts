import { z } from "zod";
import type { Dictionary } from "@/lib/i18n/types";

const USERNAME = /^[a-z0-9_.-]{3,30}$/i;

export function loginSchema(t: Dictionary["validation"]) {
  return z.object({
    identifier: z
      .string()
      .trim()
      .max(254, t.identifierInvalid)
      .refine(
        (value) => z.email().safeParse(value).success || USERNAME.test(value),
        t.identifierInvalid,
      ),
    password: z.string().min(1, t.passwordRequired),
  });
}

export type LoginInput = z.infer<ReturnType<typeof loginSchema>>;

/**
 * Accept the canonical API keys and the common camel-case field names used
 * by older/cached registration clients. Validation still decides whether all
 * five required values are present.
 */
export function normalizeRegisterInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object") return {};
  const value = input as Record<string, unknown>;
  return {
    first_name: value.first_name ?? value.firstName ?? value.name,
    surname: value.surname ?? value.lastName,
    username: value.username,
    email: value.email,
    password: value.password,
  };
}

export function registerSchema(t: Dictionary["validation"]) {
  return z.object({
    first_name: z
      .string({ error: t.firstNameRequired })
      .trim()
      .min(1, t.firstNameRequired)
      .max(100, t.nameMax100),
    surname: z
      .string({ error: t.surnameRequired })
      .trim()
      .min(1, t.surnameRequired)
      .max(100, t.nameMax100),
    username: z
      .string({ error: t.usernameInvalid })
      .trim()
      .toLowerCase()
      .regex(USERNAME, t.usernameInvalid),
    email: z.email({ error: t.emailInvalid }),
    password: z.string({ error: t.passwordMin8 }).min(8, t.passwordMin8),
  });
}

export type RegisterInput = z.infer<ReturnType<typeof registerSchema>>;
