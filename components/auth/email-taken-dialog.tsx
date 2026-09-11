"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { LogIn, MailWarning } from "lucide-react";
import { useDictionary } from "@/components/i18n/locale-provider";
import { interpolate } from "@/lib/i18n/interpolate";
import { Button } from "@/components/ui/button";

type EmailTakenDialogProps = {
  /** The already-registered email; the dialog is open while this is set. */
  email: string | null;
  onClose: () => void;
  onUseDifferentEmail: () => void;
};

/**
 * "This email is already registered" popup on the register page. A native
 * <dialog> opened with showModal() gives real modal semantics, focus
 * trapping and Escape-to-close for free.
 */
export function EmailTakenDialog({
  email,
  onClose,
  onUseDifferentEmail,
}: EmailTakenDialogProps) {
  const dict = useDictionary();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (email && dialog && !dialog.open) dialog.showModal();
  }, [email]);

  function chooseDifferentEmail() {
    dialogRef.current?.close();
    onUseDifferentEmail();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="email-taken-title"
      aria-describedby="email-taken-body"
      onClose={onClose}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself) closes it.
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="bg-card text-card-foreground border-border backdrop:bg-foreground/40 m-auto w-[calc(100%-3rem)] max-w-sm rounded-3xl border p-6 text-center shadow-lg"
    >
      <div className="bg-primary/10 text-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl">
        <MailWarning aria-hidden className="h-6 w-6" />
      </div>
      <h2 id="email-taken-title" className="text-lg font-semibold">
        {dict.auth.emailTakenTitle}
      </h2>
      <p id="email-taken-body" className="text-muted-foreground mt-2 text-sm break-words">
        {interpolate(dict.auth.emailTakenBody, { email: email ?? "" })}
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Link
          href="/login"
          className="bg-primary text-primary-foreground flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-base font-medium transition-opacity active:opacity-80"
        >
          <LogIn aria-hidden className="h-4 w-4 shrink-0 rtl:-scale-x-100" />
          {dict.auth.logIn}
        </Link>
        <Button type="button" variant="secondary" onClick={chooseDifferentEmail}>
          {dict.auth.useDifferentEmail}
        </Button>
      </div>
    </dialog>
  );
}
