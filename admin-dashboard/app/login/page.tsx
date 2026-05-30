import { OtpForm } from "@/components/auth/otp-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In · InvestIQ Admin",
};

export default function LoginPage() {
  return <OtpForm />;
}
