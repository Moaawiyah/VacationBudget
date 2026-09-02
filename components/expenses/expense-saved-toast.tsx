"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Check } from "lucide-react";

export function ExpenseSavedToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const visible = searchParams.get("created") === "1";

  useEffect(() => {
    if (!visible) return;
    const timeout = setTimeout(() => {
      router.replace(pathname);
    }, 2500);
    return () => clearTimeout(timeout);
  }, [visible, router, pathname]);

  if (!visible) return null;

  return (
    <div className="bg-foreground text-background fixed top-[calc(env(safe-area-inset-top)+1rem)] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg">
      <Check className="h-4 w-4" />
      Expense added
    </div>
  );
}
