import type { MetadataRoute } from "next";
import { getAllRecipeIds } from "./lib/recipe-server";

const SITE = "https://bloom.rohanmahnot.space";

/**
 * One entry per recipe. This only became possible once recipes had real URLs —
 * hash fragments are invisible to crawlers, so there was previously nothing to
 * list but the homepage.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ids = await getAllRecipeIds();

  const recipes: MetadataRoute.Sitemap = ids.map(({ id, createdAt }) => ({
    url: `${SITE}/r/${id}`,
    lastModified: createdAt ? new Date(createdAt) : undefined,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [
    { url: SITE, changeFrequency: "daily", priority: 1 },
    ...recipes,
  ];
}
