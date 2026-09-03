"use client";

import { signOut } from "@/app/actions";
import { useDictionary } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const dict = useDictionary();
  return (
    <form action={signOut}>
      <Button type="submit" variant="secondary">
        {dict.auth.logOut}
      </Button>
    </form>
  );
}
