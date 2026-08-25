import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";

// Design system: "Acero y Territorio" — direct industrial service site for Faro Estructuras.
export const WHATSAPP_NUMBER = "59163544951";
export const WHATSAPP_CATALOG_URL = `https://wa.me/c/${WHATSAPP_NUMBER}`;
export const WHATSAPP_QUOTE_MESSAGE =
  "Hola Franz, me gustaría solicitar una cotización para un trabajo de techos.";
export const WHATSAPP_QUOTE_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_QUOTE_MESSAGE)}`;

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Starts the platform OAuth flow only from an explicit user action. */
export function startLogin() {
  const portalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const nonce = crypto.randomUUID();
  const state = encodeOAuthState({ redirectUri, nonce });

  document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; SameSite=Lax; Secure`;
  window.location.assign(
    `${portalUrl}?appId=${encodeURIComponent(appId)}&redirectUri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`,
  );
}
