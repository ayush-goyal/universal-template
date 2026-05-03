import type { App } from "firebase-admin/app";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";

/**
 * Lazy Firebase Admin initialization.
 *
 * The previous version called `initializeApp` at module load, which broke
 * `next build`'s page-data collection pass: production builds run with
 * `NODE_ENV=production` but no `GOOGLE_CLOUD_*` env vars, so `cert({})`
 * threw "Service account object must contain a string 'project_id'
 * property" before any tRPC procedure could even decline to use Firebase.
 *
 * We now lazy-init via `getApp()`. Callers that need Firebase (e.g. push
 * notification senders) must call this — it returns `null` when no
 * credentials are configured, so callers can degrade gracefully.
 */
let cachedApp: App | null | undefined = undefined;

export function getApp(): App | null {
  if (cachedApp !== undefined) return cachedApp;

  const existing = getApps()[0];
  if (existing) {
    cachedApp = existing;
    return cachedApp;
  }

  try {
    if (process.env.NODE_ENV === "development" && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      cachedApp = initializeApp({ credential: applicationDefault() });
    } else if (
      process.env.GOOGLE_CLOUD_PROJECT &&
      process.env.GOOGLE_CLOUD_PRIVATE_KEY &&
      process.env.GOOGLE_CLOUD_CLIENT_EMAIL
    ) {
      cachedApp = initializeApp({
        credential: cert({
          projectId: process.env.GOOGLE_CLOUD_PROJECT,
          privateKey: process.env.GOOGLE_CLOUD_PRIVATE_KEY.replace(/\\n/g, "\n"),
          clientEmail: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        }),
      });
    } else {
      cachedApp = null;
    }
  } catch (err) {
    console.warn("[firebase] failed to initialize, push features disabled", err);
    cachedApp = null;
  }
  return cachedApp;
}
