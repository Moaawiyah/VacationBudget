import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "@/lib/i18n/dictionaries/en";
import RegisterPage from "@/app/register/page";
import LoginPage from "@/app/login/page";

vi.stubGlobal("React", React);
vi.mock("@/components/i18n/locale-provider", () => ({ useDictionary: () => en }));
vi.mock("@/app/register/actions", () => ({ register: vi.fn() }));
vi.mock("@/app/login/actions", () => ({ login: vi.fn() }));

describe("account forms", () => {
  it("shows exactly five required, labelled signup fields", () => {
    const html = renderToStaticMarkup(createElement(RegisterPage));
    expect(html.match(/<input\b/g)).toHaveLength(5);
    expect(html.match(/required=""/g)).toHaveLength(5);
    for (const [id, name] of [
      ["first-name", "first_name"],
      ["surname", "surname"],
      ["username", "username"],
      ["register-email", "email"],
      ["register-password", "password"],
    ]) {
      expect(html).toContain(`for="${id}"`);
      expect(html).toContain(`id="${id}"`);
      expect(html).toContain(`name="${name}"`);
    }
    expect(html).toContain('autoComplete="given-name"');
    expect(html).toContain('autoComplete="family-name"');
  });
  it("accepts a username or email in a text login field", () => {
    const html = renderToStaticMarkup(createElement(LoginPage));
    expect(html).toContain(en.auth.identifier);
    expect(html).toContain('name="identifier"');
    expect(html).toContain('type="text"');
    expect(html).not.toContain('type="email"');
    expect(html).toContain('autoComplete="username"');
    expect(html).toContain('autoComplete="current-password"');
  });
});
