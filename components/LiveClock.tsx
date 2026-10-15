"use client";

import { useEffect, useState } from "react";

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <span>&nbsp;</span>;
  return (
    <span suppressHydrationWarning>
      {now.toISOString().slice(0, 19).replace("T", " ")} UTC · T+{Math.floor(now.getTime() / 1000).toLocaleString("en-US")}
    </span>
  );
}
