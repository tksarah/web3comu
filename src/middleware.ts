import { NextRequest, NextResponse } from "next/server";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
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

function addConfiguredDomain(origins: Set<string>) {
  const configured = process.env.DOMAIN?.trim();
  if (!configured) {
    return;
  }

  if (configured.includes("://")) {
    addOrigin(origins, configured);
    return;
  }

  const domain = configured.replace(/\/+$/, "");
  addOrigin(origins, `https://${domain}`);
  addOrigin(origins, `http://${domain}`);
}

function getAllowedOrigins(request: NextRequest) {
  const origins = new Set<string>();
  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const host = forwardedHost || request.headers.get("host");
  const proto = forwardedProto || request.nextUrl.protocol.replace(":", "") || "https";

  addOrigin(origins, request.nextUrl.origin);
  if (host) {
    addOrigin(origins, `${proto}://${host}`);
    addOrigin(origins, `https://${host}`);
  }
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

  if (!getAllowedOrigins(request).has(origin)) {
    return forbidden();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"]
};
