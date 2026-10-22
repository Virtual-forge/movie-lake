import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Minimal shared chrome for the auth pages. Server-compatible (no hooks) —
 * client forms import the field renderer too.
 */

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-[26rem] flex-col justify-center px-5 py-16">
      <div className="rounded-2xl border border-border bg-surface p-6 md:p-7">
        <p
          aria-hidden
          className="text-[10px] font-semibold tracking-[0.38em] text-content-muted"
        >
          MOVIE LAKE
        </p>
        <h1 className="mt-3 text-xl font-semibold text-content">{title}</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-content-secondary">
          {subtitle}
        </p>
        <div className="mt-6">{children}</div>
      </div>
      <div className="mt-5 text-[13px] text-content-secondary">{footer}</div>
      <p className="text-[12px] text-content-muted">
        Favorites are saved server-side once you{"'"}re signed in — they follow
        you across devices.{" "}
        <Link
          href="/"
          className="underline decoration-border underline-offset-2 transition-colors hover:text-content"
        >
          Back to Discover
        </Link>
      </p>
    </main>
  );
}

export function AuthField({
  label,
  name,
  type,
  autoComplete,
  value,
  onChange,
  error,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label
        htmlFor={`${name}-input`}
        className="mb-1.5 block text-[12px] font-medium text-content-secondary"
      >
        {label}
      </label>
      <input
        id={`${name}-input`}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`h-10 w-full rounded-lg border bg-surface-elevated px-3 text-[13px] text-content placeholder:text-content-muted focus:outline-none ${
          error
            ? "border-favorite/60 focus:border-favorite"
            : "border-border focus:border-[#4a4744]"
        }`}
      />
      {error ? (
        <p id={`${name}-error`} className="mt-1 text-[12px] text-favorite">
          {error}
        </p>
      ) : null}
    </div>
  );
}
