import Link from "next/link";
import type { Story } from "@/lib/desk";
import type { Art } from "@/lib/images";
import type { Section } from "@/lib/sections";
import { ago } from "@/lib/format";
import { STATIC } from "@/lib/static";
import { thumbDataUri } from "@/lib/thumb";

// Generated illustrations are served by /api/thumb on Vercel and embedded in the page in static mode.
const artSrc = (src: string) => (STATIC && src.startsWith("/api/thumb/") ? thumbDataUri(src.slice("/api/thumb/".length)) : src);

export function ArtFigure({ art, caption = false, priority = false }: { art: Art; caption?: boolean; priority?: boolean }) {
  return (
    <figure>
      <div className={art.fit === "contain" ? "art art-contain" : "art"}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={artSrc(art.src)} alt={art.alt} loading={priority ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer" />
      </div>
      {caption && (
        <figcaption>
          {art.kind === "photo" ? (
            <>
              {art.sourceUrl ? <a href={art.sourceUrl} target="_blank" rel="noopener noreferrer">{art.credit}</a> : art.credit}
              {art.license && <> · {art.licenseUrl ? <a href={art.licenseUrl} target="_blank" rel="noopener noreferrer">{art.license}</a> : art.license}</>}
            </>
          ) : (
            art.credit
          )}
        </figcaption>
      )}
    </figure>
  );
}

export function Verified({ story }: { story: Story }) {
  if (story.status !== "confirmed") return <span className="verified pending">◌ Awaiting confirmation</span>;
  const primary = story.outlets.length < 2;
  return (
    <span className="verified" title={story.basis}>
      ✓ {primary ? "Primary source" : `Confirmed by ${story.outlets.length} outlets`}
    </span>
  );
}

export function SectionKicker({ section }: { section: Section }) {
  return (
    <Link href={`/section/${section.slug}`} className="kicker">
      {section.name}
    </Link>
  );
}

export function StoryMeta({ story, now }: { story: Story; now: number }) {
  return (
    <div className="meta">
      <Verified story={story} />
      <span>{ago(story.lastUpdate, now)}</span>
      <span>{story.outlets.slice(0, 2).join(", ")}{story.outlets.length > 2 ? ` +${story.outlets.length - 2}` : ""}</span>
    </div>
  );
}

/** Our own summary when the AI desk has written one, otherwise the publisher's snippet. */
export function dek(s: { summary: string; editorial?: { summary: string } }): string {
  return s.editorial?.summary.split(/\n\s*\n/)[0].trim() || s.summary;
}

export function clip(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, s.lastIndexOf(" ", n)) + "…";
}
