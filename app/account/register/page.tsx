import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell, FormSkeleton } from "../_components/auth-shell";
import { RegisterForm } from "../_components/auth-forms";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a Pot Stories account for faster checkout and order tracking.",
};

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Join Pot Stories"
      title={
        <>
          Create your <em className="text-forest-600">account</em>
        </>
      }
      intro="Faster checkout, saved addresses and every order in one place."
      aside={<p>Your bag and wishlist from this device are added to your new account automatically.</p>}
    >
      <Suspense fallback={<FormSkeleton fields={3} />}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
