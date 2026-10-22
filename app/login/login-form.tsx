"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { AuthField } from "@/components/auth-form";
import { signIn } from "@/lib/auth-client";
import { sanitizeRedirect } from "@/lib/redirect";

/**
 * Email/password sign-in through Better Auth's browser client, so its
 * session store (and therefore the header and favorite buttons) updates
 * without a page reload. The redirect target, when present, is restricted
 * to same-origin app paths by sanitizeRedirect.
 *
 * The page mounts this inside a <Suspense> boundary because useSearchParams
 * is a request read under Cache Components.
 */
export function LoginForm() {
  const router = useRouter();
  const redirectParam = useSearchParams().get("redirect");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const trimmedEmail = email.trim();
    if (!/^\S+@\S+$/.test(trimmedEmail)) {
      setFieldErrors({ email: "Enter a valid email address." });
      return;
    }
    if (password.length < 8) {
      setFieldErrors({ password: "Password needs at least 8 characters." });
      return;
    }

    setSubmitting(true);
    const { error } = await signIn.email({
      email: trimmedEmail,
      password,
    });
    setSubmitting(false);
    if (error) {
      setFormError(error.message ?? "Sign-in failed. Check your email and password.");
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
        autoComplete="current-password"
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
        {submitting ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-[12px] text-content-muted">
        Forgot your password? Password reset arrives in a later phase.
      </p>
      <p className="text-center text-[12px] text-content-muted">
        Google sign-in appears here automatically once OAuth credentials exist
        in the project environment.
      </p>
      <p className="text-center text-[12px] text-content-muted">
        <Link
          href={
            redirectParam
              ? `/register?redirect=${encodeURIComponent(redirectParam)}`
              : "/register"
          }
          className="text-content-secondary underline decoration-border underline-offset-2 transition-colors hover:text-content"
        >
          New here? Create an account
        </Link>
      </p>
    </form>
  );
}
