import { PublicClientApplication, InteractionRequiredAuthError } from "https://cdn.jsdelivr.net/npm/@azure/msal-browser@4/+esm";
import { config, apiScope, isConfigured } from "./config.js";

let msalApp;
let initialized = false;

export async function initializeAuth() {
  if (!isConfigured) throw new Error("Microsoft sign-in is not configured yet. Complete the setup in README.md.");
  if (!msalApp) {
    msalApp = new PublicClientApplication({
      auth: {
        clientId: config.clientId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
        redirectUri: config.redirectUri,
        postLogoutRedirectUri: config.postLogoutRedirectUri,
        navigateToLoginRequestUrl: false,
      },
      cache: { cacheLocation: "sessionStorage", storeAuthStateInCookie: false },
    });
  }
  if (!initialized) {
    await msalApp.initialize();
    const result = await msalApp.handleRedirectPromise();
    if (result?.account) msalApp.setActiveAccount(result.account);
    if (!msalApp.getActiveAccount() && msalApp.getAllAccounts().length) {
      msalApp.setActiveAccount(msalApp.getAllAccounts()[0]);
    }
    initialized = true;
  }
  return msalApp;
}

export async function signIn() {
  const app = await initializeAuth();
  await app.loginRedirect({ scopes: [apiScope], redirectUri: config.redirectUri });
}

export async function signOut() {
  const app = await initializeAuth();
  const account = app.getActiveAccount();
  await app.logoutRedirect({ account, postLogoutRedirectUri: config.postLogoutRedirectUri });
}

export async function getAccessToken() {
  const app = await initializeAuth();
  const account = app.getActiveAccount();
  if (!account) return null;
  try {
    const result = await app.acquireTokenSilent({ account, scopes: [apiScope] });
    return result.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      await app.acquireTokenRedirect({ account, scopes: [apiScope], redirectUri: config.redirectUri });
      return null;
    }
    throw error;
  }
}

export async function apiRequest(path, options = {}, authenticated = false) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (authenticated) {
    const token = await getAccessToken();
    if (!token) throw new Error("Please sign in to continue.");
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${config.apiBaseUrl}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}
