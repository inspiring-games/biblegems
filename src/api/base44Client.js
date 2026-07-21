// Supabase compatibility adapter for existing `base44` imports.
// This lets the current app keep using `base44.auth` and `base44.entities` while
// service calls are routed to Supabase.
import { supabase, supabaseAuth } from '@/api/supabaseClient';
import { getCacheKey, readCacheEntry, writeCacheEntry, invalidateTable } from '@/lib/queryCache';

const supabaseDebug = {
  queryCount: 0,
  queries: [],
  reset() {
    this.queryCount = 0;
    this.queries = [];
  },
  getSummary() {
    const totalMs = this.queries.reduce((sum, item) => sum + (item.elapsedMs || 0), 0);
    const slowest = this.queries.reduce((current, item) => (item.elapsedMs > (current?.elapsedMs || 0) ? item : current), null);
    return {
      queryCount: this.queryCount,
      totalMs,
      averageMs: this.queries.length ? Math.round(totalMs / this.queries.length) : 0,
      slowest
    };
  },
  logSummary(label = 'supabase') {
    const summary = this.getSummary();
    console.info(`[supabase:summary] ${label}`, summary);
    return summary;
  }
};

if (typeof window !== 'undefined') {
  window.__biblegemsSupabaseDebug = supabaseDebug;
}

function nowMs() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

async function runSupabaseQuery(queryBuilder, { tableName, operation, context = {} }) {
  const cacheKey = getCacheKey(tableName, operation, context);
  const cached = readCacheEntry(cacheKey);
  if (cached && !cached.stale) {
    return { data: cached.data, error: null };
  }

  const startedAt = nowMs();
  const queryNumber = supabaseDebug.queryCount + 1;
  supabaseDebug.queryCount = queryNumber;

  try {
    const { data, error } = await queryBuilder;
    const elapsedMs = Math.round(nowMs() - startedAt);

    const entry = {
      queryNumber,
      tableName,
      operation,
      elapsedMs,
      context,
      error: error ? { message: error.message } : null
    };

    supabaseDebug.queries.push(entry);

    console.info(`[supabase:${queryNumber}] ${tableName}.${operation} ${elapsedMs}ms`, context);
    if (error) throw error;

    if (typeof data !== 'undefined') {
      writeCacheEntry(cacheKey, data);
    }
    return { data, error };
  } catch (error) {
    const elapsedMs = Math.round(nowMs() - startedAt);
    const entry = {
      queryNumber,
      tableName,
      operation,
      elapsedMs,
      context,
      error: { message: error?.message || String(error) }
    };
    supabaseDebug.queries.push(entry);
    console.error(`[supabase:${queryNumber}] ${tableName}.${operation} failed in ${elapsedMs}ms`, context, error);
    throw error;
  }
}

const entityMap = {
  Gem: 'gems',
  BibleVerse: 'bible_verses',
  BibleTranslation: 'bible_translations',
  Report: 'reports',
  Follow: 'follows',
  BlockedUser: 'blocked_users',
  User: 'profiles'
};

const entityProxy = (entityName) => {
  const tableName = entityMap[entityName] || entityName.toLowerCase();

  return {
    list: async (sort, limit) => {
      let query = supabase.from(tableName).select('*');
      if (sort) {
        const column = sort.replace(/^-/, '');
        const ascending = !sort.startsWith('-');
        query = query.order(column, { ascending });
      }
      if (limit) query = query.limit(limit);
      const { data, error } = await runSupabaseQuery(query, { tableName, operation: 'list', context: { sort, limit } });
      if (error) throw error;
      return data || [];
    },
    filter: async (filters = {}) => {
      let query = supabase.from(tableName).select('*');
      if (Object.keys(filters).length > 0) {
        if (tableName === 'gems' && filters.book && filters.chapter && filters.verse === undefined && filters.user_id === undefined) {
          query = query.eq('book', filters.book).eq('chapter', filters.chapter).order('verse', { ascending: true });
        } else {
          query = query.match(filters);
        }
      }
      const { data, error } = await runSupabaseQuery(query, { tableName, operation: 'filter', context: filters });
      if (error) throw error;
      return data || [];
    },
    create: async (payload) => {
        const { data, error } = await runSupabaseQuery(supabase.from(tableName).insert(payload).select(), { tableName, operation: 'create', context: payload });
      if (error) throw error;
      invalidateTable(tableName);
      return Array.isArray(data) ? data[0] : data;
    },
    bulkCreate: async (payload) => {
      const { data, error } = await runSupabaseQuery(supabase.from(tableName).insert(payload).select(), { tableName, operation: 'bulkCreate', context: { count: payload?.length || 0 } });
      if (error) throw error;
      invalidateTable(tableName);
      return data || [];
    },
    update: async (id, payload) => {
      const { data, error } = await runSupabaseQuery(supabase.from(tableName).update(payload).eq('id', id).select(), { tableName, operation: 'update', context: { id, payload } });
      if (error) throw error;
      invalidateTable(tableName);
      return Array.isArray(data) ? data[0] : data;
    },
    delete: async (id) => {
      const { data, error } = await runSupabaseQuery(supabase.from(tableName).delete().eq('id', id).select(), { tableName, operation: 'delete', context: { id } });
      if (error) throw error;
      invalidateTable(tableName);
      return data || [];
    }
  };
};

export const base44 = {
  auth: {
    loginViaEmailPassword: async (email, password) => {
      const res = await supabaseAuth.signInWithPassword(email, password);
      if (res.error) throw res.error;
      return res.data;
    },
    register: async ({ email, password }) => {
      const res = await supabaseAuth.signUpWithPassword(email, password);
      if (res.error) throw res.error;
      return res.data;
    },
    verifyOtp: async () => {
      throw new Error('OTP flow is not supported in the Supabase migration. Please log in with email and password.');
    },
    resendOtp: async () => {
      throw new Error('OTP flow is not supported in the Supabase migration.');
    },
    loginWithProvider: async (provider, redirectTo) => {
      if (provider !== 'google') {
        throw new Error('Only Google provider is currently supported via waiting room.');
      }
      return supabaseAuth.signInWithGoogle(redirectTo);
    },
    setToken: async (token) => {
      if (!token) return;
      await supabase.auth.setSession({ access_token: token, refresh_token: null });
    },
    me: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },
    logout: async (redirectUrl) => {
      await supabase.auth.signOut();
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    },
    redirectToLogin: (redirectTo) => {
      window.location.href = '/login';
    },
    resetPasswordRequest: async (email) => {
      return supabaseAuth.resetPasswordForEmail(email, window.location.origin + '/reset-password');
    },
    resetPassword: async ({ resetToken, newPassword }) => {
      await supabase.auth.setSession({ access_token: resetToken, refresh_token: null });
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return data;
    }
  },
  entities: new Proxy({}, {
    get: (_target, entityName) => entityProxy(entityName)
  }),
  integrations: {
    Core: {
      SendEmail: async (payload) => {
        console.warn('SendEmail is not implemented in Supabase adapter', payload);
        return { success: true };
      }
    }
  }
};
