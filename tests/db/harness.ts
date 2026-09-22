import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

/**
 * A real Postgres (PGlite, compiled to WASM) with the repo's actual
 * migrations applied — so these tests exercise the same RLS policies,
 * triggers and constraints production runs, not a mock of them.
 *
 * Only the Supabase pieces the migrations depend on are emulated: the
 * auth.users table, auth.uid() (read from the same GUC PostgREST sets from a
 * request's JWT), and the anon/authenticated roles with Supabase's default
 * table grants.
 */
const SUPABASE_BOOTSTRAP = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb not null default '{}'
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public
    grant all on tables to anon, authenticated, service_role;
`;

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

export async function createDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_BOOTSTRAP);
  // VB_MIGRATIONS_UPTO=0008 replays history only up to that migration — how
  // to confirm a test actually fails against the schema a fix replaced.
  const upTo = process.env.VB_MIGRATIONS_UPTO;
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql") && (!upTo || f.slice(0, 4) <= upTo))
    .sort();
  for (const file of files) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
  return db;
}

/** Deterministic, readable UUIDs: uid(1) → 00000000-…-000000000001. */
export function uid(n: number): string {
  return `00000000-0000-0000-0000-${n.toString(16).padStart(12, "0")}`;
}

/** Signs a user up the way Supabase Auth does (the profiles trigger fires). */
export async function createUser(db: PGlite, id: string, username: string) {
  await db.query(
    "insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)",
    [id, `${username}@example.test`, JSON.stringify({ username })],
  );
}

/**
 * Runs `fn` as a signed-in user: role `authenticated`, with auth.uid()
 * returning `userId` — what every PostgREST request carrying that user's JWT
 * gets. RLS applies; column grants apply.
 */
export async function asUser<T>(db: PGlite, userId: string, fn: () => Promise<T>) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  await db.exec("set role authenticated");
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

/** The SQLSTATE a query failed with, or null if it succeeded. */
export async function errorCode(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run();
    return null;
  } catch (error) {
    return (error as { code?: string }).code ?? "unknown";
  }
}
