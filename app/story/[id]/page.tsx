import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEdition, getStory } from "@/lib/news";
import { ago } from "@/lib/format";
import { SITE } from "@/lib/site";
import { ArtFigure, SectionKicker, StoryMeta, clip } from "@/components/StoryBits";
import { JsonLd } from "@/components/JsonLd";

export const revalidate = 600;

// Rendered on first request, then cached and refreshed like the front page.
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const story = await getStory((await params).id);
  if (!story) return { title: "Story not found", robots: { index: false } };
  const description = story.summary || story.basis;
  const image = story.art.src.startsWith("/") ? `${SITE.url}${story.art.src}` : story.art.src;
  return {
    title: story.headline,
    description,
    alternates: { canonical: `/story/${story.id}` },
    openGraph: { type: "article", title: story.headline, description, url: `/story/${story.id}`, images: [image], publishedTime: new Date(story.firstSeen).toISOString(), modifiedTime: new Date(story.lastUpdate).toISOString(), section: story.section.name },
    twitter: { card: "summary_large_image", title: story.headline, description, images: [image] },
  };
}

export default async function StoryPage({ params }: Props) {
  const id = (await params).id;
  const story = await getStory(id);
  if (!story) notFound();
  const ed = await getEdition();
  const now = ed.generatedAt;
  const more = ed.stories.filter((s) => s.id !== story.id && s.section.slug === story.section.slug).slice(0, 4);

  return (
    <article className="page">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: story.headline,
          description: story.summary || story.basis,
          image: [story.art.src.startsWith("/") ? `${SITE.url}${story.art.src}` : story.art.src],
          datePublished: new Date(story.firstSeen).toISOString(),
          dateModified: new Date(story.lastUpdate).toISOString(),
          articleSection: story.section.name,
          mainEntityOfPage: `${SITE.url}/story/${story.id}`,
          publisher: { "@type": "NewsMediaOrganization", name: SITE.name, url: SITE.url, logo: { "@type": "ImageObject", url: `${SITE.url}/icon.svg` } },
          isBasedOn: story.reports.map((r) => ({ "@type": "NewsArticle", headline: r.title, url: r.link, publisher: { "@type": "Organization", name: r.outlet } })),
        }}
      />
      <SectionKicker section={story.section} />
      <h1 className="title">{story.headline}</h1>
      {story.summary && <p className="dek">{story.summary}</p>}
      <div className="byline">
        <span>Daily Super Intelligence wire desk</span>
        <span>First reported {ago(story.firstSeen, now)}</span>
        <span>Updated {ago(story.lastUpdate, now)}</span>
      </div>
      <ArtFigure art={story.art} caption priority />

      <div className="verify-box">
        <h2>Verification</h2>
        <p style={{ margin: "0 0 4px" }}>{story.basis}</p>
        <p style={{ margin: 0, color: "var(--ink-3)" }}>
          Confidence {story.confidence}% · {story.reports.length} report{story.reports.length === 1 ? "" : "s"} matched to this event ·{" "}
          <Link href="/about" style={{ textDecoration: "underline" }}>How we verify</Link>
        </p>
      </div>

      <h2 className="rail-h"><span>Coverage</span><small>read the full reporting at the source</small></h2>
      <ul className="reports">
        {story.reports.map((r) => (
          <li key={r.link}>
            <div className="outlet">{r.outlet}{r.primary ? " · primary source" : ""} · {ago(r.publishedAt, now)}</div>
            <a href={r.link} target="_blank" rel="noopener noreferrer">
              <h3 className="hl-m">{r.title} ↗</h3>
            </a>
            {r.summary && <p className="summary">{r.summary}</p>}
          </li>
        ))}
      </ul>

      {more.length > 0 && (
        <section style={{ marginTop: 34 }}>
          <h2 className="rail-h"><span>More in {story.section.name}</span><Link href={`/section/${story.section.slug}`}><small>See all ›</small></Link></h2>
          <ul className="headlines">
            {more.map((s) => (
              <li key={s.id}>
                <Link href={`/story/${s.id}`}><h3 className="hl-s">{s.headline}</h3></Link>
                {s.summary && <p className="summary" style={{ fontSize: 14 }}>{clip(s.summary, 140)}</p>}
                <StoryMeta story={s} now={now} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
