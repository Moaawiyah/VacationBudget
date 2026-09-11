import { CUSTOM_CATEGORY_ICON } from "@/lib/icons";
import type { Category } from "@/types/category";
import { BaseService } from "./base-service";
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

  /** Creates one of the user's own categories (always with the custom icon). */
  async create(
    userId: string,
    name: string,
  ): Promise<{ category: Category } | { error: string }> {
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
