import { CUSTOM_CATEGORY_ICON } from "@/lib/icons";
import type { Category } from "@/types/category";
import { BaseService } from "./base-service";
import type { AppErrorCode } from "./errors";
import type { DbClient } from "./types";

export class CategoryService extends BaseService {
  constructor(db: DbClient) {
    super(db, "categories");
  }

  /** System categories (user_id null) plus the user's own custom ones, by name. */
  list(): Promise<Category[]> {
    return this.memo("all", async () => {
      const { data } = await this.db.from("categories").select("*").order("name");
      return data ?? [];
    });
  }

  /**
   * The categories `userId` may attach to an expense: system ones and their
   * own. list() also returns other members' categories visible through shared
   * trips (needed to *display* their expenses), but RLS won't accept those
   * on a new row — so a picker offering them would offer a guaranteed error.
   * `keepId` keeps an existing expense's category selectable when editing.
   */
  async listPickable(userId: string, keepId?: string): Promise<Category[]> {
    return (await this.list()).filter(
      (c) => c.user_id === null || c.user_id === userId || c.id === keepId,
    );
  }

  /** Creates one of the user's own categories (always with the custom icon). */
  async create(
    userId: string,
    name: string,
  ): Promise<{ category: Category } | { error: string; code?: AppErrorCode }> {
    const { data, error } = await this.db
      .from("categories")
      .insert({ user_id: userId, name, icon: CUSTOM_CATEGORY_ICON })
      .select()
      .single();
    if (error || !data)
      return this.fail("create", error ?? { message: "No category returned" });
    this.invalidate();
    return { category: data };
  }
}
