import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project-id')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface RegistrationData {
  user_id?: string;
  full_name: string;
  email: string;
  phone: string;
  batch: number;
  created_at?: string;
}

export interface AppConfig {
  reveal_at: string;
  event_date: string;
}

const DEFAULT_CONFIG: AppConfig = {
  reveal_at: '2026-11-01T10:00:00+05:30',
  event_date: 'DATE TO BE ANNOUNCED'
};

// Config loader
export async function getConfig(): Promise<AppConfig> {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('config').select('key, value');
      if (!error && data && data.length > 0) {
        const configMap: Record<string, string> = {};
        data.forEach((item: { key: string; value: string }) => {
          configMap[item.key] = item.value;
        });
        return {
          reveal_at: configMap['reveal_at'] || DEFAULT_CONFIG.reveal_at,
          event_date: configMap['event_date'] || DEFAULT_CONFIG.event_date
        };
      }
    } catch (err) {
      console.warn('Could not load config from Supabase, using defaults:', err);
    }
  }
  
  // Local fallback
  const localConfig = localStorage.getItem('tgpcop_fresher_config');
  if (localConfig) {
    try {
      return JSON.parse(localConfig);
    } catch {
      // fallback
    }
  }
  return DEFAULT_CONFIG;
}

// Check existing registration
export async function getExistingRegistration(userId?: string): Promise<RegistrationData | null> {
  if (supabase) {
    try {
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        uid = user?.id;
      }
      if (!uid) return null;

      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching registration:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('Supabase fetch registration error:', err);
      return null;
    }
  }

  // Local storage mock mode
  const localReg = localStorage.getItem('tgpcop_fresher_registered_user');
  if (localReg) {
    try {
      return JSON.parse(localReg);
    } catch {
      return null;
    }
  }
  return null;
}

// User sign up + register
export async function registerStudent(params: {
  fullName: string;
  email: string;
  phone: string;
  batch: number;
  password?: string;
}): Promise<RegistrationData> {
  if (supabase) {
    // 1. Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: params.email,
      password: params.password || 'TgpCop@2026',
    });

    if (authError) {
      // If user already registered in auth, attempt sign in
      if (authError.message.toLowerCase().includes('already registered')) {
        throw new Error('This email is already registered. Please switch to the Login tab.');
      }
      throw authError;
    }

    const userId = authData.user?.id;
    if (!userId) {
      throw new Error('Unable to retrieve authenticated user ID.');
    }

    // 2. Insert into registrations table
    const regPayload = {
      user_id: userId,
      full_name: params.fullName,
      email: params.email,
      phone: params.phone,
      batch: params.batch,
    };

    const { data: regData, error: regError } = await supabase
      .from('registrations')
      .insert(regPayload)
      .select()
      .single();

    if (regError) {
      if (regError.code === '23505') {
        throw new Error('You have already registered for Fresher\'s Party!');
      }
      throw regError;
    }

    return regData;
  }

  // Mock implementation for instant local testing
  const mockRegistration: RegistrationData = {
    user_id: 'mock-user-' + Date.now(),
    full_name: params.fullName,
    email: params.email,
    phone: params.phone,
    batch: params.batch,
    created_at: new Date().toISOString()
  };
  localStorage.setItem('tgpcop_fresher_registered_user', JSON.stringify(mockRegistration));
  return mockRegistration;
}

// User sign in
export async function signInStudent(params: {
  email: string;
  password?: string;
}): Promise<RegistrationData | null> {
  if (supabase) {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password || 'TgpCop@2026',
    });

    if (authError) {
      throw authError;
    }

    const userId = authData.user?.id;
    if (!userId) throw new Error('Authentication failed');

    const reg = await getExistingRegistration(userId);
    return reg;
  }

  // Mock implementation
  const localReg = localStorage.getItem('tgpcop_fresher_registered_user');
  if (localReg) {
    const parsed = JSON.parse(localReg);
    if (parsed.email.toLowerCase() === params.email.toLowerCase()) {
      return parsed;
    }
  }
  throw new Error('No registration found for this email in demo mode. Please Sign Up first.');
}

// User sign out
export async function signOutStudent(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut();
  }
  localStorage.removeItem('tgpcop_fresher_registered_user');
}
