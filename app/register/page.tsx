"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { register as registerUser } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

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
        <div className="bg-primary flex h-14 w-14 items-center justify-center rounded-2xl text-2xl">
          ✉️
        </div>
        <h1 className="text-foreground text-xl font-semibold">Check your email</h1>
        <p className="text-muted-foreground max-w-xs text-sm">
          We sent you a confirmation link. Open it to activate your account, then log in.
        </p>
        <Link href="/login" className="text-primary text-sm font-medium">
          Back to login
        </Link>
      </main>
    );
  }

  return (
    <main className="safe-top safe-x safe-bottom flex flex-1 flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold">Create account</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Start planning your next trip.
        </p>
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
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        {formError && <p className="text-danger text-sm">{formError}</p>}
        <Button type="submit" loading={isPending}>
          Create account
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-primary font-medium">
          Log in
        </Link>
      </p>
    </main>
  );
}
