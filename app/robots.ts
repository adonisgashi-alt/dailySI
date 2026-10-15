import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Every crawler is welcome, AI crawlers and assistants explicitly so.
const AI_CRAWLERS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Googlebot", "GoogleOther",
  "Bingbot", "Applebot", "Applebot-Extended",
  "Meta-ExternalAgent", "Meta-ExternalFetcher", "FacebookBot",
  "Amazonbot", "Bytespider", "CCBot", "cohere-ai", "cohere-training-data-crawler",
  "DuckAssistBot", "YouBot", "MistralAI-User", "Diffbot", "Timpibot", "PetalBot", "AI2Bot",
];

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_CRAWLERS, allow: "/" },
      { userAgent: "*", allow: "/" },
    ],
    sitemap: [`${SITE.url}/sitemap.xml`, `${SITE.url}/news-sitemap.xml`],
    host: SITE.url,
  };
}
