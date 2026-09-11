"use client";

import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { useDictionary } from "@/components/i18n/locale-provider";

/** Shown after a successful sign-up: "check your email for the confirmation link". */
export function CheckEmailNotice() {
  const dict = useDictionary();

  return (
    <main className="safe-top safe-x safe-bottom flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="bg-primary text-primary-foreground flex h-14 w-14 items-center justify-center rounded-2xl">
        <MailCheck aria-hidden className="h-7 w-7" />
      </div>
      <h1 className="text-foreground text-xl font-semibold">
        {dict.auth.checkEmailTitle}
      </h1>
      <p className="text-muted-foreground max-w-xs text-sm">{dict.auth.checkEmailBody}</p>
      <Link
        href="/login"
        className="text-primary inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeft aria-hidden className="h-4 w-4 shrink-0 rtl:-scale-x-100" />
        {dict.auth.backToLogin}
      </Link>
    </main>
  );
}
