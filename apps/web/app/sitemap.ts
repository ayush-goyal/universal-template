import type { MetadataRoute } from "next";

/**
 * Public routes that should be discoverable. Anything under `/app/*`,
 * `/api/*`, or auth flows is intentionally excluded — see robots.ts.
 */
const PUBLIC_ROUTES: {
  path: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly";
}[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
  { path: "/privacy-policy", priority: 0.3, changeFrequency: "monthly" },
  { path: "/terms-and-conditions", priority: 0.3, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not set");
  }

  const lastModified = new Date();

  return PUBLIC_ROUTES.map((r) => ({
    url: `${baseUrl}${r.path}`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
