export function getSafeRedirect(value: string | null, fallback = "/dashboard") {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\s\u0000-\u001f\u007f]/.test(value)
  ) {
    return fallback;
  }

  const baseURL = "https://redirect.invalid";
  const url = new URL(value, baseURL);
  if (url.origin !== baseURL || url.pathname.startsWith("//")) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
