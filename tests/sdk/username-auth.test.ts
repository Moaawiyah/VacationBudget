import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "@/lib/sdk/auth-service";
import { callsOf, createFakeDb, muteErrorLog } from "../helpers/fake-db";

afterEach(() => vi.restoreAllMocks());
const identity = { first_name: "Moa", surname: "Haj", username: "Moa.Haj" };
describe("username authentication", () => {
  it("resolves a username privately and authenticates the password with Supabase", async () => {
    const { db, auth } = createFakeDb();
    const admin = createFakeDb({ profiles: [{ data: [{ email: "moa@example.com" }] }] });
    auth.signInWithPassword.mockResolvedValue({ error: null });
    expect(await new AuthService(db, admin.db).signIn(" Moa.Haj ", "password")).toEqual(
      {},
    );
    expect(callsOf(admin.calls, "profiles", "eq")).toEqual([["username", "moa.haj"]]);
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "moa@example.com",
      password: "password",
    });
  });
  it("keeps email login working without a privileged lookup", async () => {
    const { db, auth } = createFakeDb();
    auth.signInWithPassword.mockResolvedValue({ error: null });
    expect(await new AuthService(db).signIn(" Moa@Example.com ", "password")).toEqual({});
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "moa@example.com",
      password: "password",
    });
  });
  it.each([{ data: [] }, { error: { message: "lookup failed" } }])(
    "rejects a missing or failed username lookup",
    async (result) => {
      const { db, auth } = createFakeDb();
      const admin = createFakeDb({ profiles: [result] });
      expect(
        await new AuthService(db, admin.db).signIn("unknown", "password"),
      ).toHaveProperty("error");
      expect(auth.signInWithPassword).not.toHaveBeenCalled();
    },
  );
  it("fails closed when the server lookup is not configured", async () => {
    const { db, auth } = createFakeDb();
    expect(await new AuthService(db).signIn("unknown", "password")).toHaveProperty(
      "error",
    );
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });
  it("persists identity through signup metadata and normalizes the username", async () => {
    const { db, auth } = createFakeDb();
    const admin = createFakeDb({ profiles: [{ data: [] }, { data: [] }] });
    auth.signUp.mockResolvedValue({ data: { user: { identities: [{}] } }, error: null });
    expect(
      await new AuthService(db, admin.db).register(
        "moa@example.com",
        "password",
        "https://app.test/auth/confirm",
        identity,
      ),
    ).toEqual({ status: "created" });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "moa@example.com",
      password: "password",
      options: {
        emailRedirectTo: "https://app.test/auth/confirm",
        data: { ...identity, username: "moa.haj" },
      },
    });
  });
  it("rejects taken usernames before creating an account", async () => {
    const { db, auth } = createFakeDb();
    const admin = createFakeDb({
      profiles: [{ data: [] }, { data: [{ id: "another-user" }] }],
    });
    expect(
      await new AuthService(db, admin.db).register(
        "moa@example.com",
        "password",
        "https://app.test",
        identity,
      ),
    ).toEqual({ status: "username_taken" });
    expect(auth.signUp).not.toHaveBeenCalled();
  });
  it("does not create an account when the username pre-check fails", async () => {
    muteErrorLog();
    const { db, auth } = createFakeDb();
    const admin = createFakeDb({
      profiles: [{ data: [] }, { error: { message: "unavailable" } }],
    });
    expect(
      await new AuthService(db, admin.db).register(
        "moa@example.com",
        "password",
        "https://app.test",
        identity,
      ),
    ).toHaveProperty("status", "error");
    expect(auth.signUp).not.toHaveBeenCalled();
  });
});
