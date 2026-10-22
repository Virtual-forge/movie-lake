import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth-form";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <AuthCard
      title="Sign in"
      subtitle="Your favorites live on Movie Lake's server — sign in and they follow you across devices."
    >
      {/* useSearchParams inside the form is a request read — keep it behind
          the boundary so the page shell stays instant. */}
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}

function LoginFormFallback() {
  return (
    <p className="text-[13px] text-content-muted" aria-busy>
      Loading sign-in…
    </p>
  );
}
