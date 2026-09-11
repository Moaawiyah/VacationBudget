import type { EmailOtpType, User } from "@supabase/supabase-js";
import { BaseService } from "./base-service";
import type { DbClient, WriteResult } from "./types";

export type RegisterResult =
  { status: "created" } | { status: "email_taken" } | { status: "error"; error: string };

/** Sessions, sign-in, sign-up and sign-out, via Supabase Auth. */
export class AuthService extends BaseService {
  /** `admin` is the service-role client; without it the email pre-check is skipped. */
  constructor(
    db: DbClient,
    private readonly admin: DbClient | null = null,
  ) {
    super(db, "auth");
  }

  async getUser(): Promise<User | null> {
    const { data } = await this.db.auth.getUser();
    return data.user;
  }

  async signIn(email: string, password: string): Promise<WriteResult> {
    const { error } = await this.db.auth.signInWithPassword({ email, password });
    // A wrong password is an expected outcome, not a failure worth logging.
    return error ? { error: error.message } : {};
  }

  async signOut(): Promise<void> {
    await this.db.auth.signOut();
  }

  /** Exchanges the one-time token from a confirmation email for a session. */
  async verifyEmail(type: EmailOtpType, tokenHash: string): Promise<boolean> {
    const { error } = await this.db.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) this.fail("verifyEmail", error);
    return !error;
  }

  /**
   * Every auth user — confirmed or not — has a profiles row (created by the
   * on_auth_user_created trigger), so it doubles as an "is this email taken?"
   * lookup. Needs the service-role client, since RLS only lets users read
   * their own row; without it this answers false.
   */
  async isEmailRegistered(email: string): Promise<boolean> {
    if (!this.admin) return false;
    const { data, error } = await this.admin
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .limit(1);
    if (error) {
      this.fail("isEmailRegistered", error);
      return false;
    }
    return data.length > 0;
  }

  /**
   * Supabase's signUp never errors on a taken email (it hides that to prevent
   * account enumeration) and silently re-sends the confirmation mail for an
   * unconfirmed account — so check first, then fall back to signUp's own
   * signals when the pre-check can't run.
   */
  async register(
    email: string,
    password: string,
    emailRedirectTo: string,
  ): Promise<RegisterResult> {
    if (await this.isEmailRegistered(email)) return { status: "email_taken" };

    const { data, error } = await this.db.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });
    if (error) {
      // What Supabase returns instead when email confirmation is turned off.
      if (error.code === "user_already_exists") return { status: "email_taken" };
      return { status: "error", ...this.fail("register", error) };
    }
    // An existing, confirmed account comes back as a user with no identities.
    if (data.user && data.user.identities?.length === 0) return { status: "email_taken" };
    return { status: "created" };
  }
}
