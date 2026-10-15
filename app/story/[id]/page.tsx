import type { Metadata } from "next";
import { idFromSlug, storyPath, storySlug } from "@/lib/slug";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getEdition, getStory, type EditionStory } from "@/lib/news";
import { findArchived, type ArchivedStory } from "@/lib/archive";
import { SECTION_BY_SLUG, SECTIONS } from "@/lib/sections";
import { ago } from "@/lib/format";
import { SITE } from "@/lib/site";
import { ArtFigure, SectionKicker, StoryMeta, clip, dek } from "@/components/StoryBits";
import { JsonLd } from "@/components/JsonLd";
import { STATIC, allStorySlugs } from "@/lib/static";

export const revalidate = 600;

// Rendered on first request, then cached and refreshed like the front page.
export async function generateStaticParams() {
  return STATIC ? (await allStorySlugs()).map((id) => ({ id })) : [];
}

type Props = { params: Promise<{ id: string }> };

type Shown = Omit<EditionStory, "reports" | "tokens"> & { reports: ArchivedStory["reports"]; archived: boolean };

/** The live story if it is still on the wire, otherwise the archived copy. */
async function load(param: string): Promise<Shown | null> {
  const id = idFromSlug(param);
  const live = await getStory(id);
  if (live) return { ...live, archived: false };
  const a = await findArchived(id);
  if (!a) return null;
  return { ...a, section: SECTION_BY_SLUG.get(a.section) ?? SECTIONS[0], relevance: 0, archived: true } as Shown;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const story = await load((await params).id);
  if (!story) return { title: "Story not found", robots: { index: false } };
  const description = dek(story) || story.basis;
  // Generated illustrations are embedded in the page in static mode, so they have no URL to share.
  const image = story.art.src.startsWith("/") ? (STATIC ? `${SITE.url}/icon.png` : `${SITE.url}${story.art.src}`) : story.art.src;
  return {
    title: story.headline,
    description,
    alternates: { canonical: storyPath(story) },
    openGraph: { type: "article", title: story.headline, description, url: storyPath(story), images: [image], publishedTime: new Date(story.firstSeen).toISOString(), modifiedTime: new Date(story.lastUpdate).toISOString(), section: story.section.name },
    twitter: { card: "summary_large_image", title: story.headline, description, images: [image] },
  };
}

export default async function StoryPage({ params }: Props) {
  const param = (await params).id;
  const story = await load(param);
  if (!story) notFound();
  // Old id-only links and links with an outdated headline go to the current address.
  if (!STATIC && param !== storySlug(story)) permanentRedirect(storyPath(story));
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
          description: dek(story) || story.basis,
          image: [story.art.src.startsWith("/") ? (STATIC ? `${SITE.url}/icon.png` : `${SITE.url}${story.art.src}`) : story.art.src],
          datePublished: new Date(story.firstSeen).toISOString(),
          dateModified: new Date(story.lastUpdate).toISOString(),
          articleSection: story.section.name,
          mainEntityOfPage: `${SITE.url}${storyPath(story)}`,
          publisher: { "@type": "NewsMediaOrganization", name: SITE.name, url: SITE.url, logo: { "@type": "ImageObject", url: `${SITE.url}/icon.png` } },
          isBasedOn: story.reports.map((r) => ({ "@type": "NewsArticle", headline: r.title, url: r.link, publisher: { "@type": "Organization", name: r.outlet } })),
        }}
      />
      <SectionKicker section={story.section} />
      <h1 className="title">{story.headline}</h1>
      {story.editorial ? <p className="dek">{story.editorial.whyItMatters}</p> : story.summary && <p className="dek">{story.summary}</p>}
      <div className="byline">
        <span>Daily Super Intelligence wire desk</span>
        <span>First reported {ago(story.firstSeen, now)}</span>
        <span>Updated {ago(story.lastUpdate, now)}</span>
        {story.archived && (
          <Link href={`/archive/${new Date(story.firstSeen).toISOString().slice(0, 10)}`} style={{ textDecoration: "underline" }}>From the archive</Link>
        )}
      </div>
      <ArtFigure art={story.art} caption priority />

      {story.editorial && (
        <section className="editorial" aria-label="Summary">
          {story.editorial.summary.split(/\n\s*\n/).map((para, i) => <p key={i}>{para}</p>)}
          {story.editorial.keyFacts.length > 0 && (
            <>
              <h2>Key facts</h2>
              <ul>{story.editorial.keyFacts.map((f) => <li key={f}>{f}</li>)}</ul>
            </>
          )}
          <p className="ai-note">
            Written by the Daily Super Intelligence AI desk from the {story.reports.length} report{story.reports.length === 1 ? "" : "s"} listed below, using only what
            they state. Read the original reporting for full details.
          </p>
        </section>
      )}

      <div className="verify-box">
        <h2>Verification</h2>
        <p style={{ margin: "0 0 4px" }}>{story.basis}</p>
        {story.editorial && !story.editorial.sourcesAgree && story.editorial.note && (
          <p style={{ margin: "0 0 4px", color: "var(--warn)" }}>Sources differ: {story.editorial.note}</p>
        )}
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
                <Link href={storyPath(s)}><h3 className="hl-s">{s.headline}</h3></Link>
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
