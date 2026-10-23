import Keycloak from "keycloak-js";

export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:8080",
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? "kwot",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "kwot-web",
});

/** Initializes Keycloak once, before React renders (StrictMode would double-init otherwise). */
export function initAuth(): Promise<boolean> {
  return keycloak.init({
    onLoad: "check-sso",
    pkceMethod: "S256",
    silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    checkLoginIframe: false,
  });
}

export type Role = "customer" | "servicer";

const INTENDED_ROLE_KEY = "kwot.intendedRole";

/** Remembers which landing-page button was used, so onboarding can preselect it. */
export function register(role: Role) {
  try {
    sessionStorage.setItem(INTENDED_ROLE_KEY, role);
  } catch {
    // Storage unavailable: onboarding will just ask without a preselection.
  }
  return keycloak.register({ redirectUri: `${window.location.origin}/onboarding` });
}

export function intendedRole(): Role | null {
  try {
    const value = sessionStorage.getItem(INTENDED_ROLE_KEY);
    return value === "customer" || value === "servicer" ? value : null;
  } catch {
    return null;
  }
}

export const login = () => keycloak.login({ redirectUri: `${window.location.origin}/` });
export const logout = () => keycloak.logout({ redirectUri: `${window.location.origin}/` });
