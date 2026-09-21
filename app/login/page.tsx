"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Lock, LogIn, Mail, Plane } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { useDictionary } from "@/components/i18n/locale-provider";
import { login } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const dict = useDictionary();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema(dict.validation)) });

  function onSubmit(data: LoginInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await login(data);
      if (result?.error) setFormError(result.error);
    });
  }

  return (
    <main className="safe-top safe-x safe-bottom flex flex-1 flex-col justify-center gap-6 px-6">
      <div>
        <div className="bg-primary text-primary-foreground mb-4 flex h-12 w-12 items-center justify-center rounded-2xl">
          <Plane aria-hidden className="h-6 w-6" />
        </div>
        <h1 className="text-foreground text-2xl font-semibold">
          {dict.auth.welcomeBack}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{dict.auth.loginSubtitle}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          id="login-identifier"
          label={dict.auth.identifier}
          icon={Mail}
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          error={errors.identifier?.message}
          {...register("identifier")}
        />
        <Input
          id="login-password"
          label={dict.auth.password}
          icon={Lock}
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        {formError && <p className="text-danger text-sm">{formError}</p>}
        <Button type="submit" loading={isPending} className="gap-2">
          <LogIn aria-hidden className="h-4 w-4 shrink-0 rtl:-scale-x-100" />
          {dict.auth.logIn}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        {dict.auth.noAccount}{" "}
        <Link href="/register" className="text-primary font-medium">
          {dict.auth.registerLink}
        </Link>
      </p>
    </main>
  );
}
