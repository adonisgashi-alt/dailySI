"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SECTIONS } from "@/lib/sections";

export const NAV = [
  { href: "/", name: "Front Page" },
  { href: "/latest", name: "Latest" },
  ...SECTIONS.map((s) => ({ href: `/section/${s.slug}`, name: s.nav })),
  { href: "/risk", name: "Risk Meters" },
  { href: "/archive", name: "Archive" },
];

export function SectionNav() {
  const path = usePathname();
  return (
    <nav className="sections" aria-label="Sections">
      <ul>
        {NAV.map((n) => (
          <li key={n.href}>
            <Link href={n.href} aria-current={path === n.href ? "page" : undefined}>{n.name}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
