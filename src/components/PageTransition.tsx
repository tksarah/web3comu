"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { type MouseEvent, type ReactNode, useEffect, useMemo, useState } from "react";

type Props = {
  children: ReactNode;
};

const EXIT_FADE_MS = 180;
const ENTRY_FADE_MS = 220;

function shouldSkipTransition(event: MouseEvent<HTMLDivElement>) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return true;
  }

  const anchor = (event.target as Element | null)?.closest("a");
  if (!anchor) {
    return true;
  }

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || anchor.hasAttribute("download")) {
    return true;
  }

  const target = anchor.getAttribute("target");
  if (target && target !== "_self") {
    return true;
  }

  const nextUrl = new URL(anchor.href, window.location.href);
  if (nextUrl.origin !== window.location.origin) {
    return true;
  }

  const currentUrl = new URL(window.location.href);
  return nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search;
}

export function PageTransition({ children }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);
  const [isExiting, setIsExiting] = useState(false);

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (shouldSkipTransition(event)) {
      return;
    }

    setIsExiting(true);
  }

  useEffect(() => {
    setIsExiting(false);
  }, [routeKey]);

  useEffect(() => {
    if (!isExiting) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsExiting(false);
    }, EXIT_FADE_MS + ENTRY_FADE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isExiting]);

  return (
    <div className="page-transition-root" onClickCapture={handleClickCapture}>
      <div className="page-transition-content" key={routeKey}>
        {children}
      </div>
      <div className="page-transition-overlay" data-active={isExiting} aria-hidden="true" />
    </div>
  );
}
