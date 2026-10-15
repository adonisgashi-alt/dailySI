import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStory } from "@/lib/news";
import { ago } from "@/lib/format";
import { ArtFigure, VerifiedBadge } from "@/components/StoryBits";

export const revalidate = 600;

// Rendered on first request, then cached and refreshed like the front page.
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const story = await getStory((await params).id);
  if (!story) return { title: "Story not found" };
  return { title: story.headline, description: story.summary || story.basis };
}

export default async function StoryPage({ params }: Props) {
  const story = await getStory((await params).id);
  if (!story) notFound();
  const now = Date.now();

  return (
    <article className="story">
      <div className="kicker">
        <Link href="/">← Front page</Link>
        <VerifiedBadge story={story} />
        <span>First reported {ago(story.firstSeen, now)} · updated {ago(story.lastUpdate, now)}</span>
      </div>
      <h1>{story.headline}</h1>
      {story.summary && <p className="dek">{story.summary}</p>}
      <ArtFigure art={story.art} />

      <div className="verify-box">
        <h3>Verification</h3>
        <p style={{ margin: "0 0 6px" }}>{story.basis}</p>
        <p style={{ margin: 0, color: "var(--ink-3)" }}>
          Confidence {story.confidence}% · {story.reports.length} report{story.reports.length === 1 ? "" : "s"} matched to this event.{" "}
          <Link href="/about#verification" style={{ textDecoration: "underline" }}>How we verify</Link>
        </p>
      </div>

      <h2 className="section-head"><span>Coverage</span><small>read the full reporting at the source</small></h2>
      <ul className="clean reports">
        {story.reports.map((r) => (
          <li key={r.link}>
            <div className="outlet">{r.outlet}{r.primary ? " · primary source" : ""} · {ago(r.publishedAt, now)}</div>
            <a href={r.link} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--display)", fontSize: 20, fontWeight: 700 }}>
              {r.title} ↗
            </a>
            {r.summary && <p style={{ margin: "4px 0 0", color: "var(--ink-2)", fontSize: 15 }}>{r.summary}</p>}
          </li>
        ))}
      </ul>
    </article>
  );
}
