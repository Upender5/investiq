"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { authApi, unwrap, getApiErrorMessage } from "@/lib/api";
import { saveTokens } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BrandMark } from "@/components/brand/brand-mark";
import { GoogleSignInButton } from "@/components/auth/google-signin";
import { SocialButtons } from "@/components/auth/social-buttons";
import type { AuthTokens } from "@/types";

const phoneSchema = z.object({
  phone: z
    .string()
    .min(10, "Phone must be 10 digits")
    .max(10, "Phone must be 10 digits")
    .regex(/^\d+$/, "Phone must contain only digits"),
});

const otpSchema = z.object({
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d+$/, "OTP must contain only digits"),
});

type PhoneFormValues = z.infer<typeof phoneSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;

/**
 * OTP Login Form
 *
 * UX Research Doc 10 — Section 2.3 Onboarding Screens:
 * - Screen 1: Welcome — "Plant your first financial seed"
 * - Screen 2: Phone — auto-detect +91, large input
 * - No Facebook login (no unique ID, depends on mailid/mobile)
 * - Social: Google + Apple only
 */
export function OtpForm() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
  });

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
  });

  const handleSendOtp = async (values: PhoneFormValues) => {
    setServerError(null);
    try {
      await authApi.post("/auth/otp/send", { phone: `+91${values.phone}` });
      setPhone(values.phone);
      setStep("otp");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to send OTP. Please try again.";
      setServerError(message);
    }
  };

  const handleVerifyOtp = async (values: OtpFormValues) => {
    setServerError(null);
    try {
      const tokens = unwrap<AuthTokens>(
        await authApi.post("/auth/otp/verify", {
          phone: `+91${phone}`,
          otp: values.otp,
        })
      );
      saveTokens(tokens);
      router.push("/dashboard");
    } catch (err: unknown) {
      setServerError(getApiErrorMessage(err, "Invalid OTP. Please try again."));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* ── Header — UX Research Section 2.3 ── */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F172A]">
            <BrandMark size={36} className="text-white" />
          </div>
          {/* Editorial serif heading per UX Typography spec */}
          <h1 className="text-2xl font-bold text-foreground font-editorial">
            Plant your first financial seed
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start with ₹10. Learn as you grow.
          </p>
        </div>

        <Card>
          <CardContent>
            {step === "phone" ? (
              <form
                onSubmit={phoneForm.handleSubmit(handleSendOtp)}
                className="flex flex-col gap-5"
              >
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Sign In
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enter your registered mobile number. We&apos;ll send you a code.
                  </p>
                </div>

                <Input
                  label="Mobile Number"
                  id="phone"
                  type="tel"
                  placeholder="9876543210"
                  prefix="+91"
                  maxLength={10}
                  {...phoneForm.register("phone")}
                  error={phoneForm.formState.errors.phone?.message}
                />

                {/* Error uses text-destructive (red) — reserved for errors only per UX color psychology */}
                {serverError && (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {serverError}
                  </p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  loading={phoneForm.formState.isSubmitting}
                >
                  Send OTP
                </Button>
              </form>
            ) : (
              <form
                onSubmit={otpForm.handleSubmit(handleVerifyOtp)}
                className="flex flex-col gap-5"
              >
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Enter OTP
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    OTP sent to +91 {phone}. Check your server console in dev
                    mode.
                  </p>
                </div>

                <div className="rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary">
                  💡 In development, check the auth-service logs for the OTP
                  code.
                </div>

                <Input
                  label="6-digit OTP"
                  id="otp"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  inputMode="numeric"
                  {...otpForm.register("otp")}
                  error={otpForm.formState.errors.otp?.message}
                />

                {/* Error uses text-destructive (red) — reserved for errors only */}
                {serverError && (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {serverError}
                  </p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  loading={otpForm.formState.isSubmitting}
                >
                  Verify OTP &amp; Sign In
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setServerError(null);
                    otpForm.reset();
                  }}
                  className="text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Change number
                </button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* ── Social login — only on the initial step ──
         * UX Research: Google + Apple only. No Facebook (no unique ID).
         */}
        {step === "phone" && (
          <div className="mt-5">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground/70">or continue with</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <GoogleSignInButton onError={setServerError} />
              <SocialButtons />
            </div>
          </div>
        )}

        {/* Footer — UX brand tagline */}
        <p className="mt-6 text-center text-xs text-muted-foreground/80">
          InvestIQ &middot; Calm over chaos. Learning over trading. Progress over perfection.
        </p>
      </div>
    </div>
  );
}
