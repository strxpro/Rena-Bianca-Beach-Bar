"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function getSessionId(): string {
  if (typeof sessionStorage === "undefined") return "ssr";
  let sid = sessionStorage.getItem("_rb_sid");
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem("_rb_sid", sid);
  }
  return sid;
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    const sessionId = getSessionId();
    navigator.sendBeacon(
      "/api/track",
      JSON.stringify({
        path: pathname,
        sessionId,
        referrer: document.referrer,
        type: "pageview",
      }),
    );
  }, [pathname]);

  useEffect(() => {
    const sessionId = getSessionId();
    const ping = () => {
      navigator.sendBeacon("/api/track", JSON.stringify({ sessionId, type: "ping" }));
    };
    const id = setInterval(ping, 30_000);
    return () => clearInterval(id);
  }, []);

  return null;
}
