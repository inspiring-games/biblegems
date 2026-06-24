import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const supabaseAuth = {
  signInWithPassword: async (email, password) => {
    return await supabase.auth.signInWithPassword({ email, password });
  },
  signUpWithPassword: async (email, password) => {
    return await supabase.auth.signUp({ email, password });
  },
  signInWithGoogle: async (redirectTo) => {
    return await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  },
  signOut: async () => {
    return await supabase.auth.signOut();
  },
  getUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },
  resetPasswordForEmail: async (email, redirectTo) => {
    return await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  },
};

export const tables = {
  profiles: () => supabase.from('profiles'),
  bibleVerses: () => supabase.from('bible_verses'),
  bibleTranslations: () => supabase.from('bible_translations'),
  gems: () => supabase.from('gems'),
  reports: () => supabase.from('reports'),
  follows: () => supabase.from('follows'),
  blockedUsers: () => supabase.from('blocked_users'),
};
