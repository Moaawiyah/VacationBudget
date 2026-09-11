import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "@/lib/sdk/auth-service";
import { callsOf, createFakeDb, muteErrorLog } from "../helpers/fake-db";

afterEach(() => vi.restoreAllMocks());

const user = { id: "user-1", email: "a@b.co" };

describe("AuthService session", () => {
  it("returns the signed-in user, or null", async () => {
    const { db, auth } = createFakeDb();
    auth.getUser.mockResolvedValueOnce({ data: { user } });
    auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    const service = new AuthService(db);
    expect(await service.getUser()).toEqual(user);
    expect(await service.getUser()).toBeNull();
  });

  it("signs in, passing back Supabase's error message", async () => {
    const { db, auth } = createFakeDb();
    auth.signInWithPassword.mockResolvedValueOnce({ error: null });
    auth.signInWithPassword.mockResolvedValueOnce({
      error: { message: "Invalid login" },
    });
    const service = new AuthService(db);
    expect(await service.signIn("a@b.co", "pw")).toEqual({});
    expect(await service.signIn("a@b.co", "bad")).toEqual({ error: "Invalid login" });
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.co",
      password: "pw",
    });
  });

  it("signs out", async () => {
    const { db, auth } = createFakeDb();
    auth.signOut.mockResolvedValue({});
    await new AuthService(db).signOut();
    expect(auth.signOut).toHaveBeenCalledOnce();
  });

  it("verifies a confirmation token, logging a failure", async () => {
    const log = muteErrorLog();
    const { db, auth } = createFakeDb();
    auth.verifyOtp.mockResolvedValueOnce({ error: null });
    auth.verifyOtp.mockResolvedValueOnce({ error: { message: "expired" } });
    const service = new AuthService(db);
    expect(await service.verifyEmail("signup", "hash")).toBe(true);
    expect(await service.verifyEmail("signup", "old")).toBe(false);
    expect(auth.verifyOtp).toHaveBeenCalledWith({ type: "signup", token_hash: "hash" });
    expect(log).toHaveBeenCalledOnce();
  });
});

describe("AuthService.isEmailRegistered", () => {
  it("answers false without an admin client", async () => {
    const { db } = createFakeDb();
    expect(await new AuthService(db).isEmailRegistered("a@b.co")).toBe(false);
  });

  it("looks the lowercased email up in profiles", async () => {
    const { db } = createFakeDb();
    const admin = createFakeDb({
      profiles: [{ data: [{ id: "user-1" }] }, { data: [] }],
    });
    const service = new AuthService(db, admin.db);
    expect(await service.isEmailRegistered("A@B.co")).toBe(true);
    expect(await service.isEmailRegistered("new@b.co")).toBe(false);
    expect(callsOf(admin.calls, "profiles", "eq")[0]).toEqual(["email", "a@b.co"]);
  });

  it("answers false (and logs) when the lookup fails", async () => {
    const log = muteErrorLog();
    const { db } = createFakeDb();
    const admin = createFakeDb({ profiles: [{ error: { message: "timeout" } }] });
    expect(await new AuthService(db, admin.db).isEmailRegistered("a@b.co")).toBe(false);
    expect(log).toHaveBeenCalledOnce();
  });
});

describe("AuthService.register", () => {
  const redirect = "https://app.test/auth/confirm";

  it("stops before signUp (so no email is sent) when the email is taken", async () => {
    const { db, auth } = createFakeDb();
    const admin = createFakeDb({ profiles: [{ data: [{ id: "user-1" }] }] });
    expect(
      await new AuthService(db, admin.db).register("a@b.co", "pw", redirect),
    ).toEqual({
      status: "email_taken",
    });
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("creates the account with the confirmation redirect", async () => {
    const { db, auth } = createFakeDb();
    auth.signUp.mockResolvedValue({
      data: { user: { ...user, identities: [{}] } },
      error: null,
    });
    expect(await new AuthService(db).register("a@b.co", "pw", redirect)).toEqual({
      status: "created",
    });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "a@b.co",
      password: "pw",
      options: { emailRedirectTo: redirect },
    });
  });

  it("detects a taken email from signUp's own signals", async () => {
    const { db, auth } = createFakeDb();
    auth.signUp.mockResolvedValueOnce({
      data: { user: { ...user, identities: [] } },
      error: null,
    });
    auth.signUp.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "exists", code: "user_already_exists" },
    });
    const service = new AuthService(db);
    expect(await service.register("a@b.co", "pw", redirect)).toEqual({
      status: "email_taken",
    });
    expect(await service.register("a@b.co", "pw", redirect)).toEqual({
      status: "email_taken",
    });
  });

  it("returns other signUp errors", async () => {
    muteErrorLog();
    const { db, auth } = createFakeDb();
    auth.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: "weak password" },
    });
    expect(await new AuthService(db).register("a@b.co", "pw", redirect)).toEqual({
      status: "error",
      error: "weak password",
    });
  });
});
