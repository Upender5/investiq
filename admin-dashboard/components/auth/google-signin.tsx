"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, unwrap, getApiErrorMessage } from "@/lib/api";
import { saveTokens } from "@/lib/auth";
import type { AuthTokens } from "@/types";

/**
 * "Continue with Google" via Google Identity Services (GIS).
 *
 * GIS returns a Google **ID token** which we POST to the auth-service
 * (`POST /api/v1/auth/oauth/google { idToken }`) — matching the backend contract
 * (`OAuthService.loginWithGoogle(idToken, deviceToken)`). The service verifies the
 * token server-side and returns InvestIQ access + refresh tokens.
 *
 * Requires `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. If unset, the button is hidden so the
 * page never shows a non-functional control.
 */

interface CredentialResponse {
  credential?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (res: CredentialResponse) => void;
            ux_mode?: "popup" | "redirect";
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GSI_SRC = "https://accounts.google.com/gsi/client";
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function GoogleSignInButton({ onError }: { onError?: (msg: string) => void }) {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;

    function init() {
      if (!window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID!,
        callback: async (res: CredentialResponse) => {
          if (!res.credential) {
            onError?.("Google sign-in was cancelled.");
            return;
          }
          try {
            const tokens = unwrap<AuthTokens>(
              await authApi.post("/auth/oauth/google", { idToken: res.credential })
            );
            saveTokens(tokens);
            router.push("/dashboard");
          } catch (err) {
            onError?.(getApiErrorMessage(err, "Google sign-in failed. Please try again."));
          }
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "continue_with",
        shape: "rectangular",
      });
      setReady(true);
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing && window.google) {
      init();
      return;
    }
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", init);
    return () => script.removeEventListener("load", init);
  }, [router, onError]);

  if (!CLIENT_ID) return null;

  return (
    <div className="flex justify-center">
      <div ref={buttonRef} className={ready ? "" : "opacity-0"} />
    </div>
  );
}
