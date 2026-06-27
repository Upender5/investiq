/**
 * Authorization-Code (redirect) social login for Apple Sign-In.
 *
 * Apple issues an opaque authorization code, so the SPA carries the code
 * back to /login/callback, which posts it to the backend
 * (/auth/oauth/apple) for a server-side exchange (client secret stays on
 * the server). Google is handled separately via Google Identity Services
 * (ID token).
 *
 * UX Research Doc 10 — Section 2.3: Social login limited to Google + Apple.
 * No Facebook (no unique ID, depends on mailid/mobile number).
 * No GitHub (not relevant for Indian college students).
 */

export type CodeProvider = "apple";

const STATE_KEY = "investiq_oauth_state";

interface OAuthState {
  provider: CodeProvider;
  nonce: string;
}

export function getRedirectUri(): string {
  return `${window.location.origin}/login/callback`;
}

export const PROVIDER_CLIENT_IDS: Record<CodeProvider, string | undefined> = {
  apple: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,
};

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Begin the redirect to Apple Sign-In consent screen. */
export function startOAuthRedirect(provider: CodeProvider): void {
  const clientId = PROVIDER_CLIENT_IDS[provider];
  if (!clientId) return;

  const nonce = randomNonce();
  const state = btoa(JSON.stringify({ provider, nonce } satisfies OAuthState));
  sessionStorage.setItem(STATE_KEY, nonce);

  const redirectUri = getRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "name email",
    state,
    nonce,
    response_mode: "query",
  });

  window.location.href = `https://appleid.apple.com/auth/authorize?${params}`;
}

/** Validate the returned state and recover which provider initiated the flow. */
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
