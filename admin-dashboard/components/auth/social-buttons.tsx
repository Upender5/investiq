"use client";

import { Github, Facebook } from "lucide-react";
import { startOAuthRedirect, PROVIDER_CLIENT_IDS } from "@/lib/oauth";

/**
 * GitHub / Facebook sign-in buttons. Each button only renders when its public client
 * id is configured, so the login page never shows a non-functional control.
 * Google is rendered separately via the GIS button.
 */
export function SocialButtons() {
  const providers = [
    { key: "github" as const, label: "Continue with GitHub", Icon: Github },
    { key: "facebook" as const, label: "Continue with Facebook", Icon: Facebook },
  ].filter((p) => !!PROVIDER_CLIENT_IDS[p.key]);

  if (providers.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {providers.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => startOAuthRedirect(key)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-input bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
