import type { MetadataRoute } from "next";
import { fetchPublishedHelpSlugsForSitemap } from "@/lib/help/help-pages-server";

const SITE_URL = "https://bodrumdayiz.com.tr";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const helpSlugs = await fetchPublishedHelpSlugsForSitemap();

  const helpPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/help`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...helpSlugs.map((slug) => ({
      url: `${SITE_URL}/help/${slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/kvkk`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...helpPages,
  ];
}
