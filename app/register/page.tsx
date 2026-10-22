import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth-form";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your account"
      subtitle="Favorites are saved on Movie Lake's server and follow you across devices."
    >
      {/* useSearchParams inside the form is a request read — keep the exact
          same <Suspense> contract as the login form. */}
      <Suspense fallback={<RegisterFormFallback />}>
        <RegisterForm />
      </Suspense>
    </AuthCard>
  );
}

function RegisterFormFallback() {
  return (
    <p className="text-[13px] text-content-muted" aria-busy>
      Loading registration…
    </p>
  );
}
