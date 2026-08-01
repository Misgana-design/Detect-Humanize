import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { blogPosts, toolPages, useCasePages } from "@/lib/seo-content";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteConfig.url,                    lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${siteConfig.url}/pricing`,       lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${siteConfig.url}/detectors`,     lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteConfig.url}/faq`,           lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteConfig.url}/contact`,       lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteConfig.url}/blog`,          lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${siteConfig.url}/tools`,         lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteConfig.url}/use-cases`,     lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteConfig.url}/terms`,         lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${siteConfig.url}/privacy`,       lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${siteConfig.url}/cookies`,       lastModified: now, changeFrequency: "yearly",  priority: 0.2 },
  ];

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${siteConfig.url}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const toolRoutes: MetadataRoute.Sitemap = toolPages.map((tool) => ({
    url: `${siteConfig.url}/tools/${tool.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const useCaseRoutes: MetadataRoute.Sitemap = useCasePages.map((uc) => ({
    url: `${siteConfig.url}/use-cases/${uc.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...blogRoutes, ...toolRoutes, ...useCaseRoutes];
}
