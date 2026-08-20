import process from "node:process";

export const MIRA_RATE_LIMIT_MAX_REQUESTS = 20;
export const MIRA_RATE_LIMIT_WINDOW_MS = 60 * 1000;

const memoryBuckets = new Map();

export const createMiraMemoryRateLimitStore = ({ buckets = memoryBuckets } = {}) => ({
  kind: "memory",
  async consume(key, nowMs = Date.now()) {
    const existing = buckets.get(key);
    if (!existing || nowMs >= existing.resetAt) {
      const resetAt = nowMs + MIRA_RATE_LIMIT_WINDOW_MS;
      buckets.set(key, { count: 1, resetAt });
      return { allowed: true, retryAfterSeconds: 0, count: 1, resetAt };
    }
    if (existing.count >= MIRA_RATE_LIMIT_MAX_REQUESTS) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - nowMs) / 1000)),
        count: existing.count,
        resetAt: existing.resetAt,
      };
    }
    existing.count += 1;
    return {
      allowed: true,
      retryAfterSeconds: 0,
      count: existing.count,
      resetAt: existing.resetAt,
    };
  },
  reset() {
    buckets.clear();
  },
});

const normalizeUrl = (value = "") => String(value).trim().replace(/\/+$/, "");

export const readMiraRateLimitConfig = (env = process.env) => {
  const url = normalizeUrl(env.MIRA_RATE_LIMIT_REST_URL);
  const token = String(env.MIRA_RATE_LIMIT_REST_TOKEN || "").trim();
  const sharedStoreConfigured = Boolean(url || token);
  return {
    backend: url && token ? "shared_rest" : "memory",
    sharedStoreConfigured,
    sharedStoreConfigComplete: Boolean(url && token),
    url,
    token,
  };
};

const SHARED_RATE_LIMIT_SCRIPT = [
  "local count = redis.call('INCR', KEYS[1])",
  "if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end",
  "local ttl = redis.call('PTTL', KEYS[1])",
  "return {count, ttl}",
].join("\n");

export const createMiraSharedRestRateLimitStore = ({
  url,
  token,
  fetchImpl = globalThis.fetch,
} = {}) => ({
  kind: "shared_rest",
  async consume(key) {
    if (!url || !token || typeof fetchImpl !== "function") {
      throw new Error("shared_rate_limit_store_unavailable");
    }
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        "EVAL",
        SHARED_RATE_LIMIT_SCRIPT,
        "1",
        `mira:rate-limit:${key}`,
        String(MIRA_RATE_LIMIT_WINDOW_MS),
      ]),
    });
    if (!response.ok) throw new Error("shared_rate_limit_store_failed");
    const payload = await response.json();
    const result = payload?.result;
    if (!Array.isArray(result) || result.length < 2) {
      throw new Error("shared_rate_limit_store_invalid_response");
    }
    const count = Number(result[0]);
    const ttlMs = Number(result[1]);
    if (!Number.isFinite(count) || !Number.isFinite(ttlMs)) {
      throw new Error("shared_rate_limit_store_invalid_response");
    }
    return {
      allowed: count <= MIRA_RATE_LIMIT_MAX_REQUESTS,
      retryAfterSeconds:
        count <= MIRA_RATE_LIMIT_MAX_REQUESTS ? 0 : Math.max(1, Math.ceil(ttlMs / 1000)),
      count,
      resetAt: Date.now() + Math.max(0, ttlMs),
    };
  },
  reset() {},
});

const memoryStore = createMiraMemoryRateLimitStore();

export const createMiraRateLimitStore = ({
  env = process.env,
  fetchImpl = globalThis.fetch,
} = {}) => {
  const config = readMiraRateLimitConfig(env);
  if (config.backend === "shared_rest") {
    return {
      ...createMiraSharedRestRateLimitStore({
      url: config.url,
      token: config.token,
      fetchImpl,
      }),
      sharedStoreConfigured: config.sharedStoreConfigured,
      sharedStoreConfigComplete: config.sharedStoreConfigComplete,
    };
  }
  return {
    ...memoryStore,
    sharedStoreConfigured: config.sharedStoreConfigured,
    sharedStoreConfigComplete: config.sharedStoreConfigComplete,
  };
};

export const resetMiraMemoryRateLimitStoreForTests = () => memoryStore.reset();
