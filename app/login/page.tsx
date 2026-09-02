"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { login } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

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
        <h1 className="text-foreground text-2xl font-semibold">Welcome back</h1>
        <p className="text-muted-foreground mt-1 text-sm">Log in to your trips.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        {formError && <p className="text-danger text-sm">{formError}</p>}
        <Button type="submit" loading={isPending}>
          Log in
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        No account?{" "}
        <Link href="/register" className="text-primary font-medium">
          Register
        </Link>
      </p>
    </main>
  );
}
