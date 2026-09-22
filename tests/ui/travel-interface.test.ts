import React, { createElement, isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "@/lib/i18n/dictionaries/en";
import { ExpenseFilters } from "@/components/expenses/expense-filters";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { Sidebar } from "@/components/navigation/sidebar";
import { ReceiptScanner } from "@/components/receipts/scanner-preview";
import { CategoryChart } from "@/components/charts/category-chart";
import { BudgetCard } from "@/components/dashboard/budget-card";
import { tripRow } from "../helpers/fixtures";
import { toTrip } from "@/types/trip";

vi.stubGlobal("React", React);
vi.mock("@/components/i18n/locale-provider", () => ({
  useDictionary: () => en,
  useLocale: () => ({ bcp47: "en-US" }),
}));
vi.mock("@/lib/i18n/server", () => ({
  getDictionary: async () => en,
  getLocale: async () => "en",
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/trip/one/dashboard" }));

type NodeProps = {
  children?: React.ReactNode;
  onClick?: () => void;
  onChange?: (e: { target: { value: string } }) => void;
  value?: string;
  "aria-pressed"?: boolean;
};
function nodes(node: React.ReactNode): ReactElement<NodeProps>[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!isValidElement<NodeProps>(node)) return [];
  return [node, ...nodes(node.props.children)];
}

describe("travel interface", () => {
  it("keeps category chips controlled and passes the selected category and search to the existing filter", () => {
    const onCategoryChange = vi.fn();
    const onSearchChange = vi.fn();
    const tree = ExpenseFilters({
      search: "",
      categoryId: "food",
      categories: [
        {
          id: "food",
          name: "Food",
          icon: "utensils",
          user_id: null,
          created_at: "2026-01-01",
        },
      ],
      dict: en,
      onCategoryChange,
      onSearchChange,
    });
    const buttons = nodes(tree).filter((node) => node.type === "button");
    expect(buttons.map((node) => node.props["aria-pressed"])).toEqual([false, true]);
    buttons[0].props.onClick?.();
    expect(onCategoryChange).toHaveBeenCalledWith("all");
    nodes(tree)
      .find((node) => node.type === "input")
      ?.props.onChange?.({ target: { value: "Cafe" } });
    expect(onSearchChange).toHaveBeenCalledWith("Cafe");
  });

  it("connects mobile navigation to home, expenses, creation, trips and more", () => {
    const html = renderToStaticMarkup(createElement(BottomNav, { tripId: "one" }));
    for (const href of [
      "/trip/one/dashboard",
      "/trip/one/expenses",
      "/trip/one/expenses/new",
      "/trips",
      "/trip/one/settings",
    ])
      expect(html).toContain(`href="${href}"`);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain(en.travel.home);
  });

  it("offers working analytics and scanner routes without Copilot", () => {
    const html = renderToStaticMarkup(createElement(Sidebar, { tripId: "one" }));
    expect(html).toContain('href="/trip/one/analytics"');
    expect(html).toContain('href="/trip/one/expenses/receipt"');
    expect(html).not.toContain("Copilot");
  });

  it("announces receipt processing separately from the capture state", () => {
    const idle = renderToStaticMarkup(
      createElement(ReceiptScanner, { file: null, pending: false }),
    );
    const busy = renderToStaticMarkup(
      createElement(ReceiptScanner, { file: null, pending: true }),
    );
    expect(idle).toContain(en.travel.alignReceipt);
    expect(busy).toContain('aria-busy="true"');
    expect(busy).toContain('role="status"');
    // The first analysis stage; later stages follow while the request runs.
    expect(busy).toContain(en.receipts.stageUploading);
  });

  it("renders an empty category state without invalid chart values", () => {
    const html = renderToStaticMarkup(
      createElement(CategoryChart, { data: [], currency: "EUR" }),
    );
    expect(html).toContain(en.expenses.noExpensesTitle);
    expect(html).not.toContain("NaN");
  });

  it("shows an over-budget balance and clamps the visual progress", async () => {
    const html = renderToStaticMarkup(
      await BudgetCard({ trip: toTrip(tripRow()), spent: 1700 }),
    );
    expect(html).toContain("-€200");
    expect(html).toContain("text-danger");
    expect(html).toContain("width:100%");
  });
});
