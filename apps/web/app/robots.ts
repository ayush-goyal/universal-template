import type { MetadataRoute } from "next";

/**
 * The marketing surface (`/`, `/pricing`, `/privacy-policy`, etc.) is
 * crawlable. The product itself (`/app/*`), the dashboard redirect, the
 * auth flows, and all API routes are off-limits for crawlers.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not set");
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/app/",
          "/dashboard",
          "/sign-in",
          "/sign-up",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
