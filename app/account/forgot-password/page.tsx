import type { Metadata } from "next";
import { AuthShell } from "../_components/auth-shell";
import { ForgotPasswordForm } from "../_components/auth-forms";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a link to reset your Pot Stories password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account help"
      title={
        <>
          Forgot your <em className="text-forest-600">password?</em>
        </>
      }
      intro="Enter the email you signed up with and we'll send you a link to choose a new one."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
