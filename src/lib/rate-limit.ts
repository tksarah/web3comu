import crypto from "node:crypto";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult =
  | {
      allowed: true;
      remaining: number;
      retryAfterSeconds: 0;
    }
  | {
      allowed: false;
      remaining: 0;
      retryAfterSeconds: number;
    };

type GlobalWithRateLimit = typeof globalThis & {
  __web3comuRateLimits?: Map<string, RateLimitBucket>;
};

const MAX_BUCKETS = 5000;

function store() {
  const globalForRateLimit = globalThis as GlobalWithRateLimit;
  if (!globalForRateLimit.__web3comuRateLimits) {
    globalForRateLimit.__web3comuRateLimits = new Map();
  }
  return globalForRateLimit.__web3comuRateLimits;
}

function pruneExpired(now: number) {
  const buckets = store();
  if (buckets.size < MAX_BUCKETS) {
    return;
  }

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  pruneExpired(now);

  const buckets = store();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(limit - 1, 0), retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1)
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(limit - existing.count, 0),
    retryAfterSeconds: 0
  };
}

export function getClientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function auditClientId(clientIp: string) {
  return crypto.createHash("sha256").update(clientIp).digest("hex").slice(0, 12);
}

export function faucetRateLimitKey(action: string, clientIp: string, walletAddress: string, chainId: number) {
  return `faucet:${action}:${clientIp}:${walletAddress.toLowerCase()}:${chainId}`;
}

export function authRateLimitKey(action: string, clientIp: string, walletAddress: string) {
  return `auth:${action}:${clientIp}:${walletAddress.toLowerCase()}`;
}

export function logFaucetAudit(
  level: "info" | "warn",
  event: string,
  details: Record<string, string | number | boolean | null>
) {
  const payload = { event, at: new Date().toISOString(), ...details };
  if (level === "warn") {
    console.warn("[audit] faucet", payload);
    return;
  }

  console.info("[audit] faucet", payload);
}
