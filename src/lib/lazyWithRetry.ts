import { lazy, type ComponentType } from "react";

/**
 * lazyWithRetry — wraps React.lazy with two safeguards:
 *
 * 1. Retries the dynamic import up to N times with backoff (handles transient
 *    network blips when navigating between pages).
 * 2. If all retries fail (typical after a deploy that invalidated old chunk
 *    hashes), forces a one-time full page reload so the user gets the new
 *    bundle instead of seeing a 404 / blank screen.
 *
 * Without this, a chunk-load failure during route transition (e.g. going from
 * /planning to /work-items right after a deploy) would surface as a Suspense
 * error and fall through to the "*" route → 404 page.
 */
const RELOAD_FLAG = "atlas:chunk-reload-attempted";

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 2,
  delayMs = 250,
) {
  return lazy(async () => {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const mod = await factory();
        // Successful import — clear the reload guard so a future failure can
        // trigger a fresh reload again.
        try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* ignore */ }
        return mod;
      } catch (err) {
        lastErr = err;
        // Wait a bit before retrying (transient network issue)
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
        }
      }
    }

    // All retries exhausted. Most likely the chunk hash changed because a new
    // deploy went out. Force a one-time full reload to grab the new bundle.
    try {
      const alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === "1";
      if (!alreadyReloaded) {
        sessionStorage.setItem(RELOAD_FLAG, "1");
        window.location.reload();
        // Return a never-resolving promise so React doesn't render anything
        // while the reload is in flight.
        return new Promise(() => {}) as Promise<{ default: T }>;
      }
    } catch {
      /* sessionStorage may be unavailable — fall through and rethrow */
    }

    throw lastErr;
  });
}
