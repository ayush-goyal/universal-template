export const DEFAULT_REDIRECT = "/dashboard";

/**
 * Turns an untrusted `redirectTo` value into a path on `origin`, falling back to the dashboard when
 * it is missing or points anywhere else. Resolving with the URL constructor catches forms browsers
 * treat as off-site, like `//evil.com` and `/\evil.com`.
 */
export function getSafeRedirectPath(value: string | string[] | undefined, origin: string) {
  if (typeof value !== "string" || !value) return DEFAULT_REDIRECT;

  try {
    const url = new URL(value, origin);
    if (url.origin !== new URL(origin).origin) return DEFAULT_REDIRECT;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_REDIRECT;
  }
}

export function withRedirectTo(path: string, redirectTo: string) {
  if (redirectTo === DEFAULT_REDIRECT) return path;
  return `${path}?${new URLSearchParams({ redirectTo })}`;
}
