import { NextRequest, NextResponse } from "next/server";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const PROTECTED_API_PATHS = [
  "/api/admin/",
  "/api/profile",
  "/api/auth/logout",
  "/api/auth/verify",
  "/api/faucet/nonce",
  "/api/faucet/claims"
];

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function normalizeOrigin(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function addOrigin(origins: Set<string>, value: string | null) {
  const origin = normalizeOrigin(value);
  if (origin) {
    origins.add(origin);
  }
}

function normalizeHostname(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = value.includes("://") ? new URL(value) : new URL(`https://${value}`);
    return url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  } catch {
    return null;
  }
}

function configuredHostname() {
  return normalizeHostname(process.env.DOMAIN?.trim() || null);
}

function isLocalHostname(hostname: string | null) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isAllowedRequestHost(host: string | null, configured: string | null) {
  const hostname = normalizeHostname(host);
  if (!hostname) {
    return false;
  }
  if (isLocalHostname(hostname)) {
    return true;
  }
  if (!configured) {
    return !IS_PRODUCTION;
  }

  return hostname === configured;
}

function isTrustedForwardedHost(host: string | null, configured: string | null) {
  const hostname = normalizeHostname(host);
  if (!hostname) {
    return false;
  }
  if (!configured) {
    return !IS_PRODUCTION;
  }

  return hostname === configured;
}

function addConfiguredDomain(origins: Set<string>) {
  const configured = process.env.DOMAIN?.trim();
  if (!configured) {
    return;
  }

  if (configured.includes("://")) {
    const origin = normalizeOrigin(configured);
    if (origin && (!IS_PRODUCTION || origin.startsWith("https://"))) {
      origins.add(origin);
    }
    return;
  }

  const domain = configured.replace(/\/+$/, "");
  addOrigin(origins, `https://${domain}`);
  if (!IS_PRODUCTION) {
    addOrigin(origins, `http://${domain}`);
  }
}

function addHostOrigins(origins: Set<string>, host: string | null, proto: string, allowHost: boolean) {
  if (!host || !allowHost) {
    return;
  }

  const hostname = normalizeHostname(host);
  const isLocal = isLocalHostname(hostname);
  if (!IS_PRODUCTION || proto === "https" || isLocal) {
    addOrigin(origins, `${proto}://${host}`);
  }
  if (isLocal) {
    addOrigin(origins, `http://${host}`);
  }
  addOrigin(origins, `https://${host}`);
}

function getAllowedOrigins(request: NextRequest) {
  const origins = new Set<string>();
  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const proto = forwardedProto || request.nextUrl.protocol.replace(":", "") || "https";
  const configured = configuredHostname();

  const requestHost = request.headers.get("host");
  const requestHostname = normalizeHostname(requestHost);
  if (!IS_PRODUCTION || request.nextUrl.protocol === "https:" || isLocalHostname(requestHostname)) {
    addOrigin(origins, request.nextUrl.origin);
  }
  addHostOrigins(origins, requestHost, proto, isAllowedRequestHost(requestHost, configured));
  addHostOrigins(origins, forwardedHost, proto, isTrustedForwardedHost(forwardedHost, configured));
  addConfiguredDomain(origins);

  return origins;
}

function sourceOrigin(request: NextRequest) {
  const origin = normalizeOrigin(request.headers.get("origin"));
  if (origin) {
    return origin;
  }

  return normalizeOrigin(request.headers.get("referer"));
}

function isProtectedMutation(request: NextRequest) {
  if (!MUTATING_METHODS.has(request.method)) {
    return false;
  }

  const pathname = request.nextUrl.pathname;
  return PROTECTED_API_PATHS.some((path) => {
    if (path.endsWith("/")) {
      return pathname.startsWith(path);
    }

    return pathname === path || pathname.startsWith(`${path}/`);
  });
}

function forbidden() {
  return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
}

export function middleware(request: NextRequest) {
  if (!isProtectedMutation(request)) {
    return NextResponse.next();
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) {
    return forbidden();
  }

  const origin = sourceOrigin(request);
  if (!origin) {
    return forbidden();
  }

  const allowedOrigins = getAllowedOrigins(request);
  if (!allowedOrigins.has(origin)) {
    if (!IS_PRODUCTION) {
      console.warn("[csrf] blocked origin", {
        origin,
        allowedOrigins: Array.from(allowedOrigins),
        host: request.headers.get("host"),
        forwardedHost: request.headers.get("x-forwarded-host"),
        forwardedProto: request.headers.get("x-forwarded-proto")
      });
    }
    return forbidden();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"]
};
