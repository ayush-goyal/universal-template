export function getSecurityHeaders(production: boolean) {
  // Script and network policies depend on each app's integrations and rendering strategy.
  const csp = [
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self' https://*.posthog.com",
  ].join("; ");

  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ...(production ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
  ];
}
