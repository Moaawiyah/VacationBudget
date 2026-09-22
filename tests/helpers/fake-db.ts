import { vi } from "vitest";
import type { DbClient } from "@/lib/sdk/types";

export type FakeResult = {
  data?: unknown;
  error?: { message: string; code?: string } | null;
};
export type FakeCall = { table: string; method: string; args: unknown[] };
export type FakeRpcCall = { fn: string; args: unknown };

const BUILDER_METHODS = [
  "select",
  "insert",
  "update",
  "delete",
  "upsert",
  "eq",
  "in",
  "order",
  "limit",
  "single",
];

/**
 * A stand-in for the Supabase client. `from(table)` starts a chainable query
 * that records every call and, when awaited, resolves to the next queued
 * result for that table — `{ data: null, error: null }` once the queue is empty.
 */
export function createFakeDb(
  results: Record<string, FakeResult[]> = {},
  rpcResults: Record<string, FakeResult[]> = {},
) {
  const calls: FakeCall[] = [];
  const rpcCalls: FakeRpcCall[] = [];
  const queues = new Map(
    Object.entries(results).map(([table, list]) => [table, [...list]]),
  );
  const rpcQueues = new Map(
    Object.entries(rpcResults).map(([fn, list]) => [fn, [...list]]),
  );

  function query(table: string) {
    const result = queues.get(table)?.shift() ?? {};
    const chain: Record<string, unknown> = {};
    for (const method of BUILDER_METHODS) {
      chain[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return chain;
      };
    }
    chain.then = (
      resolve: (value: unknown) => unknown,
      reject?: (reason: unknown) => unknown,
    ) =>
      Promise.resolve({ data: result.data ?? null, error: result.error ?? null }).then(
        resolve,
        reject,
      );
    return chain;
  }

  const auth = {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    verifyOtp: vi.fn(),
    signUp: vi.fn(),
  };
  const from = vi.fn((table: string) => query(table));
  const rpc = vi.fn((fn: string, args?: unknown) => {
    rpcCalls.push({ fn, args });
    const result = rpcQueues.get(fn)?.shift() ?? {};
    return Promise.resolve({ data: result.data ?? null, error: result.error ?? null });
  });
  const db = { from, auth, rpc } as unknown as DbClient;
  return { db, from, auth, calls, rpc, rpcCalls };
}

/** The recorded calls for one table and method, e.g. every `.eq()` on "trips". */
export function callsOf(calls: FakeCall[], table: string, method: string): unknown[][] {
  return calls.filter((c) => c.table === table && c.method === method).map((c) => c.args);
}

/** Silences (and exposes) console.error, which the logger writes failures to. */
export function muteErrorLog() {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}
