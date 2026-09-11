"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowLeft, Lock, Mail, MailCheck, Plane, UserPlus } from "lucide-react";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { useDictionary } from "@/components/i18n/locale-provider";
import { register as registerUser } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const dict = useDictionary();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema(dict.validation)) });

  function onSubmit(data: RegisterInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await registerUser(data);
      if ("error" in result) {
        setFormError(result.error);
      } else {
        setSubmitted(true);
      }
    });
  }

  if (submitted) {
    return (
      <main className="safe-top safe-x safe-bottom flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="bg-primary text-primary-foreground flex h-14 w-14 items-center justify-center rounded-2xl">
          <MailCheck aria-hidden className="h-7 w-7" />
        </div>
        <h1 className="text-foreground text-xl font-semibold">
          {dict.auth.checkEmailTitle}
        </h1>
        <p className="text-muted-foreground max-w-xs text-sm">
          {dict.auth.checkEmailBody}
        </p>
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

  return (
    <main className="safe-top safe-x safe-bottom flex flex-1 flex-col justify-center gap-6 px-6">
      <div>
        <div className="bg-primary text-primary-foreground mb-4 flex h-12 w-12 items-center justify-center rounded-2xl">
          <Plane aria-hidden className="h-6 w-6" />
        </div>
        <h1 className="text-foreground text-2xl font-semibold">
          {dict.auth.createAccount}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{dict.auth.registerSubtitle}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label={dict.auth.email}
          icon={Mail}
          type="email"
          inputMode="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label={dict.auth.password}
          icon={Lock}
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        {formError && <p className="text-danger text-sm">{formError}</p>}
        <Button type="submit" loading={isPending} className="gap-2">
          <UserPlus aria-hidden className="h-4 w-4 shrink-0" />
          {dict.auth.createAccount}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        {dict.auth.alreadyHaveAccount}{" "}
        <Link href="/login" className="text-primary font-medium">
          {dict.auth.loginLink}
        </Link>
      </p>
    </main>
  );
}
