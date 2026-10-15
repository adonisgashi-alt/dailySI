import Link from "next/link";
import { SITE } from "@/lib/site";
import { editionDate } from "@/lib/format";
import { bandColor, Change } from "@/components/Meter";
import { SectionNav } from "@/components/SectionNav";
import { weeklyChange, type DailyReading } from "@/lib/daily";

export function Header({ generatedAt, today, days = [] }: { generatedAt: number; today: DailyReading; days?: DailyReading[] }) {
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
            <Change change={weeklyChange(days, "replacement")} compact />
          </span>
          <span>
            AI extinction risk <b style={{ color: bandColor(today.extinction.index) }}>{today.extinction.index}</b>
            <Change change={weeklyChange(days, "extinction")} compact />
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
