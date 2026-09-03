import { MetadataRoute } from "next";

import { env } from "@/env";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = env.SITE_URL;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
