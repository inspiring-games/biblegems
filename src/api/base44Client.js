// Supabase compatibility adapter for existing `base44` imports.
// This lets the current app keep using `base44.auth` and `base44.entities` while
// service calls are routed to Supabase.
import { supabase, supabaseAuth } from '@/api/supabaseClient';

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
      const { data, error } = await query;
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
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    create: async (payload) => {
      const { data, error } = await supabase.from(tableName).insert(payload).select();
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    bulkCreate: async (payload) => {
      const { data, error } = await supabase.from(tableName).insert(payload).select();
      if (error) throw error;
      return data || [];
    },
    update: async (id, payload) => {
      const { data, error } = await supabase.from(tableName).update(payload).eq('id', id).select();
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    delete: async (id) => {
      const { data, error } = await supabase.from(tableName).delete().eq('id', id).select();
      if (error) throw error;
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
