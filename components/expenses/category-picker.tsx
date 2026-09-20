"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { createCategory } from "@/app/trip/[id]/expenses/actions";
import { translateCategoryName } from "@/lib/i18n/category-names";
import { useDictionary } from "@/components/i18n/locale-provider";
import type { Category } from "@/types/category";
import { cn } from "@/lib/utils";

type CategoryPickerProps = {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
  /**
   * Draws attention to the picker while nothing is chosen. Used by the
   * receipt flow, where every other field arrives pre-filled — without this
   * the one field still needing input looks the same as the rest.
   */
  highlightWhenEmpty?: boolean;
};

export function CategoryPicker({
  categories: initial,
  value,
  onChange,
  error,
  highlightWhenEmpty = false,
}: CategoryPickerProps) {
  const dict = useDictionary();
  const [categories, setCategories] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await createCategory({ name });
      if ("category" in result) {
        setCategories((prev) => [...prev, result.category]);
        onChange(result.category.id);
        setNewName("");
        setAdding(false);
      }
    });
  }

  const highlighted = highlightWhenEmpty && !value;

  return (
    <div className="flex flex-col gap-2">
      <p
        className={cn(
          "text-sm font-medium",
          highlighted ? "text-primary" : "text-muted-foreground",
        )}
      >
        {dict.expenseForm.category}
        {highlighted && ` — ${dict.expenseForm.categoryStillNeeded}`}
      </p>
      <div
        className={cn(
          "grid grid-cols-4 gap-2",
          highlighted && "ring-primary/40 -m-1 rounded-2xl p-1 ring-2",
        )}
      >
        {categories.map((category) => {
          const selected = category.id === value;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onChange(category.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border p-3 text-xs font-medium transition-colors",
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              <CategoryIcon icon={category.icon} className="h-5 w-5" />
              <span className="w-full truncate text-center">
                {translateCategoryName(category.name, dict)}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="border-border text-muted-foreground flex flex-col items-center gap-1 rounded-2xl border border-dashed p-3 text-xs font-medium"
        >
          <Plus className="h-5 w-5" />
          <span>{dict.expenseForm.newCategory}</span>
        </button>
      </div>
      {adding && (
        <div className="flex gap-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={dict.expenseForm.categoryNamePlaceholder}
            className="border-border bg-card text-card-foreground focus:border-primary h-10 flex-1 rounded-xl border px-3 text-sm outline-none"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending}
            className="bg-primary text-primary-foreground h-10 rounded-xl px-4 text-sm font-medium disabled:opacity-50"
          >
            {dict.expenseForm.addCategory}
          </button>
        </div>
      )}
      {error && <p className="text-danger text-sm">{error}</p>}
    </div>
  );
}
