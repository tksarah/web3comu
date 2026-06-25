"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { type MouseEvent, type ReactNode, useEffect, useMemo, useState } from "react";

type Props = {
  children: ReactNode;
};

const EXIT_FADE_MS = 180;
const ENTRY_FADE_MS = 220;

function getInternalNavigationPathname(event: MouseEvent<HTMLDivElement>) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return null;
  }

  const anchor = (event.target as Element | null)?.closest("a");
  if (!anchor) {
    return null;
  }

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || anchor.hasAttribute("download")) {
    return null;
  }

  const target = anchor.getAttribute("target");
  if (target && target !== "_self") {
    return null;
  }

  const nextUrl = new URL(anchor.href, window.location.href);
  if (nextUrl.origin !== window.location.origin) {
    return null;
  }

  const currentUrl = new URL(window.location.href);
  if (nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search) {
    return null;
  }

  return nextUrl.pathname;
}

export function PageTransition({ children }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);
  const [isExiting, setIsExiting] = useState(false);
  const [suppressEntryFade, setSuppressEntryFade] = useState(pathname === "/");

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    const nextPathname = getInternalNavigationPathname(event);
    if (!nextPathname) {
      return;
    }

    if (pathname === "/" || nextPathname === "/") {
      setSuppressEntryFade(true);
      return;
    }

    setSuppressEntryFade(false);
    setIsExiting(true);
  }

  useEffect(() => {
    setIsExiting(false);
    if (pathname === "/") {
      setSuppressEntryFade(true);
    }
  }, [pathname, routeKey]);

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
    <div
      className="page-transition-root"
      data-landing={pathname === "/" ? "true" : "false"}
      onClickCapture={handleClickCapture}
    >
      <div
        className="page-transition-content"
        data-suppress-entry={suppressEntryFade ? "true" : "false"}
        key={routeKey}
      >
        {children}
      </div>
      <div className="page-transition-overlay" data-active={isExiting} aria-hidden="true" />
    </div>
  );
}
