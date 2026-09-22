import { logger } from "@/lib/logger";
import { APP_ERROR_FALLBACK, classifyDbError, type AppErrorCode } from "./errors";
import type { DbClient } from "./types";

/**
 * Shared plumbing for every service: the injected Supabase client, a
 * per-instance read cache, and uniform failure logging.
 *
 * One SDK — and so one set of services — is built per request (see
 * lib/sdk/server.ts), so the read cache dedupes e.g. the trip that both a
 * layout and its page load, without ever sharing data between requests.
 */
export abstract class BaseService {
  private readonly reads = new Map<string, Promise<unknown>>();

  protected constructor(
    protected readonly db: DbClient,
    private readonly scope: string,
  ) {}

  /** Runs `load` once per key for this instance and reuses its promise after that. */
  protected memo<T>(key: string, load: () => Promise<T>): Promise<T> {
    const cached = this.reads.get(key);
    if (cached) return cached as Promise<T>;
    const pending = load();
    this.reads.set(key, pending);
    return pending;
  }

  /** Drops cached reads after a write, so later reads see fresh data. */
  protected invalidate(): void {
    this.reads.clear();
  }

  /**
   * Logs a failed operation in full, but returns only a safe code and generic
   * text: the raw message names tables, policies and constraints, which a
   * user must never see.
   */
  protected fail(
    operation: string,
    error: { message: string; code?: string },
    code: AppErrorCode = classifyDbError(error),
  ): { error: string; code: AppErrorCode } {
    logger.error(`${this.scope}.${operation} failed`, {
      error: error.message,
      dbCode: error.code,
      code,
    });
    return { error: APP_ERROR_FALLBACK[code], code };
  }
}
