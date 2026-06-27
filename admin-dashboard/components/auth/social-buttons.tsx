"use client";

import { Apple } from "lucide-react";
import { startOAuthRedirect, PROVIDER_CLIENT_IDS } from "@/lib/oauth";

/**
 * Apple Sign-In button.
 *
 * UX Research Doc 10 — Section 2.3: Social login = Google + Apple only.
 * Google is rendered separately via the GIS button (google-signin.tsx).
 * No Facebook (no unique ID — depends on mailid/mobile).
 * No GitHub (not relevant for Indian college students).
 */
export function SocialButtons() {
  const appleClientId = PROVIDER_CLIENT_IDS["apple"];

  if (!appleClientId) return null;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => startOAuthRedirect("apple")}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-input bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
      >
        <Apple className="h-4 w-4" />
        Sign in with Apple
      </button>
    </div>
  );
}
