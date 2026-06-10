"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { saveTokens } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
      const response = await authApi.post<AuthTokens>("/auth/otp/verify", {
        phone: `+91${phone}`,
        otp: values.otp,
      });
      saveTokens(response.data);
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Invalid OTP. Please try again.";
      setServerError(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <svg
              className="h-8 w-8 text-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">InvestIQ</h1>
          <p className="mt-1 text-muted-foreground">Admin Dashboard</p>
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
                    Enter your registered mobile number
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

                {serverError && (
                  <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-loss">
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

                {serverError && (
                  <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-loss">
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

        <p className="mt-6 text-center text-xs text-muted-foreground/80">
          InvestIQ · For Indian College Students · Investment decisions carry
          risk
        </p>
      </div>
    </div>
  );
}
