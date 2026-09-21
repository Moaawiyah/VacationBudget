import { describe, expect, it } from "vitest";
import en from "@/lib/i18n/dictionaries/en";
import {
  loginSchema,
  normalizeRegisterInput,
  registerSchema,
} from "@/lib/validation/auth";

const signup = {
  first_name: "Moa",
  surname: "Haj",
  username: "moa.haj",
  email: "moa@example.com",
  password: "strong-password",
};
describe("signup identity", () => {
  it("normalizes canonical and cached camel-case registration payloads", () => {
    expect(normalizeRegisterInput(signup)).toEqual(signup);
    expect(
      normalizeRegisterInput({
        firstName: "Moa",
        lastName: "Haj",
        username: "moa.haj",
        email: "moa@example.com",
        password: "strong-password",
      }),
    ).toEqual(signup);
  });
  it.each(["first_name", "surname", "username", "email", "password"])(
    "requires %s",
    (field) => {
      expect(
        registerSchema(en.validation).safeParse({ ...signup, [field]: "" }).success,
      ).toBe(false);
      const missing: Record<string, unknown> = { ...signup };
      delete missing[field];
      expect(registerSchema(en.validation).safeParse(missing).success).toBe(false);
    },
  );
  it.each([
    ["first_name", en.validation.firstNameRequired],
    ["surname", en.validation.surnameRequired],
    ["username", en.validation.usernameInvalid],
    ["email", en.validation.emailInvalid],
    ["password", en.validation.passwordMin8],
  ])("returns a user-facing message when %s is absent", (field, message) => {
    const missing: Record<string, unknown> = { ...signup };
    delete missing[field];
    const result = registerSchema(en.validation).safeParse(missing);
    expect(result.error?.issues[0]?.message).toBe(message);
    expect(result.error?.issues[0]?.message).not.toContain("received undefined");
  });
  it("trims names, supports international names and normalizes usernames", () => {
    const data = registerSchema(en.validation).parse({
      ...signup,
      first_name: "  معاوية  ",
      surname: "  O’Connor  ",
      username: "  Moa.Haj  ",
    });
    expect(data.first_name).toBe("معاوية");
    expect(data.surname).toBe("O’Connor");
    expect(data.username).toBe("moa.haj");
  });
  it.each(["ab", "a".repeat(31), "bad name", "name@email", "用户名字"])(
    "rejects invalid username %s",
    (username) => {
      expect(
        registerSchema(en.validation).safeParse({ ...signup, username }).success,
      ).toBe(false);
    },
  );
  it("bounds name lengths and rejects whitespace-only names", () => {
    for (const field of ["first_name", "surname"])
      for (const value of ["  ", "a".repeat(101)]) {
        expect(
          registerSchema(en.validation).safeParse({ ...signup, [field]: value }).success,
        ).toBe(false);
      }
  });
});
describe("username or email login", () => {
  it.each(["moa.haj", "MOA_HAJ", "moa@example.com", " moa.haj "])(
    "accepts %s",
    (identifier) => {
      expect(
        loginSchema(en.validation).safeParse({ identifier, password: "password" })
          .success,
      ).toBe(true);
    },
  );
  it.each(["", " ", "ab", "not an email", "name@", "a".repeat(255)])(
    "rejects %s",
    (identifier) => {
      expect(
        loginSchema(en.validation).safeParse({ identifier, password: "password" })
          .success,
      ).toBe(false);
    },
  );
});
