import type { Metadata } from "next";
import Link from "next/link";
import { getEdition } from "@/lib/news";
import { ArtFigure, SectionKicker, StoryMeta, clip } from "@/components/StoryBits";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Latest News",
  description: "Every confirmed superintelligence and frontier-AI story, newest first.",
  alternates: { canonical: "/latest" },
};

export default async function Latest() {
  const ed = await getEdition();
  const list = [...ed.stories].sort((a, b) => b.lastUpdate - a.lastUpdate);
  return (
    <div className="page-wide">
      <div className="section-intro">
        <h1>Latest News</h1>
        <p>Every confirmed story, newest first. {list.length} stories from the past week.</p>
      </div>
      {list.map((s) => (
        <article className="list-row" key={s.id}>
          <div className="when">{new Date(s.lastUpdate).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" })} UTC</div>
          <div>
            <SectionKicker section={s.section} />
            <Link href={`/story/${s.id}`}><h2 className="hl-l">{s.headline}</h2></Link>
            {s.summary && <p className="summary">{clip(s.summary, 220)}</p>}
            <StoryMeta story={s} now={ed.generatedAt} />
          </div>
          <Link href={`/story/${s.id}`} tabIndex={-1} aria-hidden="true"><ArtFigure art={s.art} /></Link>
        </article>
      ))}
    </div>
  );
}
