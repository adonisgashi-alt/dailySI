import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEdition } from "@/lib/news";
import { SECTIONS, SECTION_BY_SLUG } from "@/lib/sections";
import { ArtFigure, StoryMeta, clip } from "@/components/StoryBits";

export const revalidate = 600;

export function generateStaticParams() {
  return SECTIONS.map((s) => ({ slug: s.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sec = SECTION_BY_SLUG.get((await params).slug);
  if (!sec) return {};
  return { title: sec.name, description: sec.blurb, alternates: { canonical: `/section/${sec.slug}` } };
}

export default async function SectionPage({ params }: Props) {
  const sec = SECTION_BY_SLUG.get((await params).slug);
  if (!sec) notFound();
  const ed = await getEdition();
  const list = ed.stories.filter((s) => s.section.slug === sec.slug).sort((a, b) => b.lastUpdate - a.lastUpdate);
  const now = ed.generatedAt;

  return (
    <div className="page-wide">
      <div className="section-intro">
        <h1>{sec.name}</h1>
        <p>{sec.blurb}</p>
      </div>
      {list.length === 0 ? (
        <div className="empty">
          <p>No confirmed {sec.name.toLowerCase()} stories in the last few days. Check the <Link href="/latest" className="link" style={{ textDecoration: "underline" }}>latest news</Link>.</p>
        </div>
      ) : (
        list.map((s) => (
          <article className="list-row" key={s.id}>
            <div className="when">{new Date(s.lastUpdate).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" })} UTC</div>
            <div>
              <Link href={`/story/${s.id}`}><h2 className="hl-l" style={{ marginTop: 0 }}>{s.headline}</h2></Link>
              {s.summary && <p className="summary">{clip(s.summary, 260)}</p>}
              <StoryMeta story={s} now={now} />
            </div>
            <Link href={`/story/${s.id}`} tabIndex={-1} aria-hidden="true"><ArtFigure art={s.art} /></Link>
          </article>
        ))
      )}
    </div>
  );
}
