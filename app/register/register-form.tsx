"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { AuthField } from "@/components/auth-form";
import { signUp } from "@/lib/auth-client";
import { sanitizeRedirect } from "@/lib/redirect";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name needs at least 2 characters.")
    .max(80, "Name is too long."),
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password needs at least 8 characters.")
    .max(72, "Password is too long."),
});

/**
 * Account creation. Better Auth signs the new user in automatically, so
 * success lands the visitor straight on the destination. Server-side
 * validation still applies (Better Auth revalidates everything).
 */
export function RegisterForm() {
  const router = useRouter();
  const redirectParam = useSearchParams().get("redirect");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = schema.safeParse({ name, email, password });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !errors[key]) {
          errors[key] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    const { error } = await signUp.email(parsed.data);
    setSubmitting(false);
    if (error) {
      setFormError(error.message ?? "Could not create the account. Try again.");
      return;
    }

    const redirect = sanitizeRedirect(redirectParam);
    router.push(redirect ?? "/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {formError ? (
        <p
          role="alert"
          className="rounded-lg border border-favorite/30 bg-favorite/10 px-3 py-2 text-[12px] text-favorite"
        >
          {formError}
        </p>
      ) : null}
      <AuthField
        label="Name"
        name="name"
        type="text"
        autoComplete="name"
        value={name}
        onChange={setName}
        error={fieldErrors.name}
      />
      <AuthField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
        error={fieldErrors.email}
      />
      <AuthField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        error={fieldErrors.password}
      />
      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        className="mt-1 h-10 rounded-full bg-content text-[13px] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-[12px] text-content-muted">
        Minimum 8 characters. Password reset arrives in a later phase — choose
        one you can keep.
      </p>
      <p className="text-center text-[12px] text-content-muted">
        <Link
          href={
            redirectParam
              ? `/login?redirect=${encodeURIComponent(redirectParam)}`
              : "/login"
          }
          className="text-content-secondary underline decoration-border underline-offset-2 transition-colors hover:text-content"
        >
          Already have an account? Sign in
        </Link>
      </p>
    </form>
  );
}
