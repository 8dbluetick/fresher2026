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
  id?: string;
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

export interface CollaborationRequest {
  id?: string;
  name: string;
  email: string;
  phone: string;
  event_type: string;
  event_date: string;
  details: string;
  created_at?: string;
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

  // Local storage demo mode
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

// Student registration using Supabase Auth + registrations table
export async function registerStudent(params: {
  fullName: string;
  email: string;
  phone: string;
  batch: number;
  password?: string;
}): Promise<RegistrationData> {
  // Client-side validations
  if (!params.fullName || params.fullName.trim().length < 2) {
    throw new Error('Please enter your full name (minimum 2 characters).');
  }
  if (!/^\S+@\S+\.\S+$/.test(params.email.trim())) {
    throw new Error('Please enter a valid email address.');
  }
  if (!/^[0-9]{10}$/.test(params.phone.trim())) {
    throw new Error('Please enter a valid 10-digit mobile number.');
  }
  if (![2023, 2024, 2025, 2026].includes(params.batch)) {
    throw new Error('Please select a valid college batch (2023 - 2026).');
  }

  if (supabase) {
    // 1. Authenticate with Supabase Auth (ensures no plaintext password in database)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: params.email.trim(),
      password: params.password || 'TgpCop@2026',
    });

    if (authError) {
      if (authError.message.toLowerCase().includes('already registered')) {
        throw new Error('This email is already registered. Please switch to the Login tab.');
      }
      throw authError;
    }

    const userId = authData.user?.id;
    if (!userId) {
      throw new Error('Unable to retrieve authenticated user ID from Supabase.');
    }

    // 2. Insert into registrations table (verified by database)
    const regPayload = {
      user_id: userId,
      full_name: params.fullName.trim(),
      email: params.email.trim(),
      phone: params.phone.trim(),
      batch: params.batch,
    };

    const { data: regData, error: regError } = await supabase
      .from('registrations')
      .insert(regPayload)
      .select()
      .single();

    if (regError) {
      if (regError.code === '23505' || regError.message?.includes('duplicate key')) {
        throw new Error('You have already registered for Fresher\'s Party with this account.');
      }
      throw new Error(`Database error: ${regError.message}`);
    }

    if (!regData) {
      throw new Error('Registration could not be confirmed by the database.');
    }

    return regData;
  }

  // Local fallback demo mode
  const mockRegistration: RegistrationData = {
    id: 'reg-' + Date.now(),
    user_id: 'mock-user-' + Date.now(),
    full_name: params.fullName.trim(),
    email: params.email.trim(),
    phone: params.phone.trim(),
    batch: params.batch,
    created_at: new Date().toISOString()
  };
  localStorage.setItem('tgpcop_fresher_registered_user', JSON.stringify(mockRegistration));
  return mockRegistration;
}

// Student sign in
export async function signInStudent(params: {
  email: string;
  password?: string;
}): Promise<RegistrationData | null> {
  if (supabase) {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: params.email.trim(),
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

  // Local demo fallback
  const localReg = localStorage.getItem('tgpcop_fresher_registered_user');
  if (localReg) {
    const parsed = JSON.parse(localReg);
    if (parsed.email.toLowerCase() === params.email.trim().toLowerCase()) {
      return parsed;
    }
  }
  throw new Error('No registration found for this email in demo mode. Please Sign Up first.');
}

// Student sign out
export async function signOutStudent(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut();
  }
  localStorage.removeItem('tgpcop_fresher_registered_user');
}

// Submit Media Collaboration Request
export async function submitCollaboration(data: {
  name: string;
  email: string;
  phone: string;
  eventType: string;
  eventDate: string;
  details: string;
}): Promise<void> {
  if (!data.name || data.name.trim().length < 2) {
    throw new Error('Please enter your name / club name.');
  }
  if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) {
    throw new Error('Please enter a valid email.');
  }
  if (!/^[0-9]{10}$/.test(data.phone.trim())) {
    throw new Error('Please enter a valid 10-digit phone number.');
  }

  if (supabase) {
    const { error } = await supabase
      .from('media_collaborations')
      .insert({
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        event_type: data.eventType,
        event_date: data.eventDate,
        details: data.details.trim(),
      });

    if (error) {
      throw new Error(`Collaboration request failed: ${error.message}`);
    }
    return;
  }

  // Local demo save
  const existingCollabs = JSON.parse(localStorage.getItem('tgpcop_media_collabs') || '[]');
  existingCollabs.push({ ...data, created_at: new Date().toISOString() });
  localStorage.setItem('tgpcop_media_collabs', JSON.stringify(existingCollabs));
}
