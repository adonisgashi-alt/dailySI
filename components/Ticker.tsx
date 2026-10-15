import Link from "next/link";
import type { Story } from "@/lib/desk";

export function Ticker({ stories }: { stories: Story[] }) {
  if (!stories.length) return null;
  const items = stories.slice(0, 12);
  return (
    <div className="ticker" aria-label="Latest confirmed headlines">
      <div className="ticker-track">
        {items.map((s) => (
          <Link key={s.id} href={`/story/${s.id}`} className="ticker-item">
            <b>{s.outlets.length > 1 ? `×${s.outlets.length}` : "PRIMARY"}</b>
            {s.headline}
          </Link>
        ))}
      </div>
    </div>
  );
}
