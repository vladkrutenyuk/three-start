import { docs } from "collections/server";
import { type InferPageType, loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { expandApiTags } from "./api-md";
import { docsContentRoute, docsRoute } from "./shared";

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: docsRoute,
  plugins: [lucideIconsPlugin()],
});

export function getPageMarkdownUrl(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, "content.md"];

  return {
    segments,
    url: `${docsContentRoute}/${segments.join("/")}`,
  };
}

export async function getLLMText(page: InferPageType<typeof source>) {
  let text = await page.data.getText("processed");

  // For API pages (e.g. /docs/api/three-start), the MDX uses custom
  // <ApiInit/> / <ApiProperties/> / etc. components that consume the JSON
  // generated under `content/docs/api/generated/`. The default `processed`
  // output leaves those tags as un-rendered JSX. Expand them inline so the
  // resulting markdown carries actual API content.
  if (page.url.startsWith("/docs/api/")) {
    const slug = page.slugs[page.slugs.length - 1];
    if (slug) text = await expandApiTags(slug, text);
  }

  return `# ${page.data.title} (${page.url})

${text}`;
}
