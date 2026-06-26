/**
 * Authorization-Code (redirect) social login for GitHub & Facebook.
 *
 * These providers issue opaque access tokens, so the SPA only carries the
 * authorization `code` back to `/login/callback`, which posts it to the backend
 * (`/auth/oauth/{provider}`) for a server-side exchange (client secret stays on the server).
 * Google is handled separately via Google Identity Services (ID token).
 */

export type CodeProvider = "github" | "facebook";

const STATE_KEY = "investiq_oauth_state";

interface OAuthState {
  provider: CodeProvider;
  nonce: string;
}

export function getRedirectUri(): string {
  return `${window.location.origin}/login/callback`;
}

export const PROVIDER_CLIENT_IDS: Record<CodeProvider, string | undefined> = {
  github: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
  facebook: process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID,
};

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Begin the redirect to the provider's consent screen. */
export function startOAuthRedirect(provider: CodeProvider): void {
  const clientId = PROVIDER_CLIENT_IDS[provider];
  if (!clientId) return;

  const nonce = randomNonce();
  const state = btoa(JSON.stringify({ provider, nonce } satisfies OAuthState));
  sessionStorage.setItem(STATE_KEY, nonce);

  const redirectUri = getRedirectUri();
  const url =
    provider === "github"
      ? "https://github.com/login/oauth/authorize?" +
        new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          scope: "read:user user:email",
          state,
        })
      : "https://www.facebook.com/v19.0/dialog/oauth?" +
        new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          scope: "email,public_profile",
          response_type: "code",
          state,
        });

  window.location.href = url;
}

/** Validate the returned `state` and recover which provider initiated the flow. */
export function consumeOAuthState(rawState: string | null): CodeProvider | null {
  if (!rawState) return null;
  const stored = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  try {
    const parsed = JSON.parse(atob(rawState)) as OAuthState;
    if (!stored || parsed.nonce !== stored) return null;
    return parsed.provider;
  } catch {
    return null;
  }
}
