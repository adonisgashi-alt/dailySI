import Link from "next/link";
import { SITE } from "@/lib/site";
import { editionDate } from "@/lib/format";
import { bandColor } from "@/components/Meter";
import { SectionNav } from "@/components/SectionNav";
import type { DailyReading } from "@/lib/daily";

export function Header({ generatedAt, today }: { generatedAt: number; today: DailyReading }) {
  return (
    <header className="wrap">
      <div className="header-top">
        <div className="left">
          <b>{editionDate(generatedAt)}</b>
          <span>Updated {new Date(generatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })} UTC</span>
        </div>
        <div className="masthead">
          <Link href="/" aria-label={`${SITE.name} home`}>Daily Super Intelligence</Link>
          <p>&ldquo;{SITE.tagline}&rdquo;</p>
        </div>
        <div className="right">
          <Link href="/risk" className="mini-meter" title="AI Replacing Humans Risk, updated daily">
            <span className="n" style={{ color: bandColor(today.replacement.index) }}>{today.replacement.index}</span>
            <span className="l">AI replacing humans</span>
          </Link>
          <Link href="/risk" className="mini-meter" title="AI Extinction Risk, updated daily">
            <span className="n" style={{ color: bandColor(today.extinction.index) }}>{today.extinction.index}</span>
            <span className="l">AI extinction risk</span>
          </Link>
        </div>
      </div>
      <SectionNav />
    </header>
  );
}
