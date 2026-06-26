"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi, unwrap, getApiErrorMessage } from "@/lib/api";
import { saveTokens } from "@/lib/auth";
import { consumeOAuthState, getRedirectUri } from "@/lib/oauth";
import type { AuthTokens } from "@/types";

/**
 * OAuth redirect landing for GitHub/Facebook. Validates `state`, posts the
 * authorization `code` to the backend for a server-side token exchange, stores the
 * returned InvestIQ tokens and continues into the app.
 */
function OAuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const code = params.get("code");
    const providerError = params.get("error_description") || params.get("error");
    if (providerError) {
      setError(providerError);
      return;
    }

    const provider = consumeOAuthState(params.get("state"));
    if (!code || !provider) {
      setError("Invalid or expired sign-in request. Please try again.");
      return;
    }

    (async () => {
      try {
        const tokens = unwrap<AuthTokens>(
          await authApi.post(`/auth/oauth/${provider}`, {
            code,
            redirectUri: getRedirectUri(),
          })
        );
        saveTokens(tokens);
        router.replace("/dashboard");
      } catch (err) {
        setError(getApiErrorMessage(err, "Social sign-in failed. Please try again."));
      }
    })();
  }, [params, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4 text-center">
      {error ? (
        <>
          <p className="max-w-sm text-sm text-loss">{error}</p>
          <button
            onClick={() => router.replace("/login")}
            className="rounded-lg border border-input px-4 py-2 text-sm text-foreground hover:bg-accent"
          >
            Back to login
          </button>
        </>
      ) : (
        <>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Completing sign-in…</p>
        </>
      )}
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <OAuthCallback />
    </Suspense>
  );
}
