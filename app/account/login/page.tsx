import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell, FormSkeleton } from "../_components/auth-shell";
import { LoginForm } from "../_components/auth-forms";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Pot Stories account to check out, track orders and manage addresses.",
};

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title={
        <>
          Sign <em className="text-forest-600">in</em>
        </>
      }
      intro="Pick up where you left off — your bag and wishlist come with you."
    >
      {/* Reads ?next= from the URL, so it renders behind Suspense. */}
      <Suspense fallback={<FormSkeleton fields={2} />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
