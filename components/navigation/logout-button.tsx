"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions";
import { useDictionary } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const dict = useDictionary();
  return (
    <form action={signOut}>
      <Button type="submit" variant="secondary" className="gap-2">
        <LogOut aria-hidden className="h-4 w-4 shrink-0 rtl:-scale-x-100" />
        {dict.auth.logOut}
      </Button>
    </form>
  );
}
