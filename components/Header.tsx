import Link from "next/link";
import { SITE } from "@/lib/site";
import { editionDate } from "@/lib/format";
import { bandColor } from "@/components/Meter";
import { SectionNav } from "@/components/SectionNav";
import type { DailyReading } from "@/lib/daily";

export function Header({ generatedAt, today }: { generatedAt: number; today: DailyReading }) {
  return (
    <header className="wrap site-header">
      <div className="utility">
        <div className="edition">
          <b>{editionDate(generatedAt)}</b>
          <span>Updated {new Date(generatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })} UTC</span>
        </div>
        <Link href="/risk" className="readings" title="Today's risk meters, updated daily">
          <span>
            AI replacing humans <b style={{ color: bandColor(today.replacement.index) }}>{today.replacement.index}</b>
          </span>
          <span>
            AI extinction risk <b style={{ color: bandColor(today.extinction.index) }}>{today.extinction.index}</b>
          </span>
        </Link>
      </div>
      <div className="masthead">
        <Link href="/" aria-label={`${SITE.name} home`}>Daily Super Intelligence</Link>
      </div>
      <SectionNav />
    </header>
  );
}
