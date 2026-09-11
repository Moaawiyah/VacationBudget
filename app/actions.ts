"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSdk } from "@/lib/sdk/server";
import { isLocale } from "@/lib/i18n/config";
import { LOCALE_COOKIE } from "@/lib/i18n/server";

export async function signOut() {
  const sdk = await getSdk();
  await sdk.auth.signOut();
  redirect("/login");
}

export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
