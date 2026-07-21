const CACHE_PREFIX = 'biblegems-cache';
const DEFAULT_TTL_MS = 10 * 60 * 1000;

function getStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage;
}

function stableSerialize(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${key}:${stableSerialize(value[key])}`);
    return `{${entries.join(',')}}`;
  }
  return String(value);
}

export function getCacheKey(tableName, operation, context = {}) {
  return `${CACHE_PREFIX}:${tableName}:${operation}:${stableSerialize(context)}`;
}

export function readCacheEntry(cacheKey, ttlMs = DEFAULT_TTL_MS) {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(cacheKey);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    if (!entry || typeof entry.expiresAt !== 'number' || !Array.isArray(entry.data)) {
      // support object values as well
      if (!entry || typeof entry.expiresAt !== 'number' || typeof entry.data === 'undefined') {
        return null;
      }
    }

    const now = Date.now();
    const isFresh = entry.expiresAt > now;
    return {
      data: entry.data,
      stale: !isFresh,
      expiresAt: entry.expiresAt
    };
  } catch (error) {
    console.warn('Cache read failed', error);
    return null;
  }
}

export function writeCacheEntry(cacheKey, data, ttlMs = DEFAULT_TTL_MS) {
  const storage = getStorage();
  if (!storage) return;

  try {
    const entry = {
      data,
      expiresAt: Date.now() + ttlMs
    };
    storage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    console.warn('Cache write failed', error);
  }
}

export function invalidateTable(tableName) {
  const storage = getStorage();
  if (!storage) return;

  try {
    const keysToRemove = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && key.startsWith(`${CACHE_PREFIX}:${tableName}:`)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => storage.removeItem(key));
  } catch (error) {
    console.warn('Cache invalidation failed', error);
  }
}
