import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell, FormSkeleton } from "../_components/auth-shell";
import { ResetPasswordForm } from "../_components/auth-forms";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account help"
      title={
        <>
          Choose a new <em className="text-forest-600">password</em>
        </>
      }
      intro="Use at least 8 characters. You'll be signed in once it's saved."
    >
      {/* Demo mode reads ?token= from the URL; Supabase uses the recovery session set by /auth/callback. */}
      <Suspense fallback={<FormSkeleton fields={2} />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
