import type { MetadataRoute } from "next";
import { getAllArticleSlugs } from "@/lib/help/articles";

const SITE_URL = "https://bodrumdayiz.com.tr";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const helpPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/help`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...getAllArticleSlugs().map((slug) => ({
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
