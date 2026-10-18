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

// 1. Send 6-digit Email OTP via Supabase Auth
export async function sendEmailOtp(email: string): Promise<{ success: boolean; message: string }> {
  if (!email || !/^\S+@\S+\.\S+$/.test(email.trim())) {
    throw new Error('Valid email address enter karo.');
  }

  if (supabase) {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      throw new Error(error.message || 'OTP send karne mein issue hua. Please check email address.');
    }

    return {
      success: true,
      message: `6-digit OTP aapke email (${email}) par bhej diya gaya hai.`,
    };
  }

  // Demo fallback
  return {
    success: true,
    message: `[DEMO MODE] OTP simulated. Demo OTP: 123456`,
  };
}

// 2. Verify Email OTP and Complete Student Registration
export async function verifyOtpAndRegister(params: {
  email: string;
  token: string;
  fullName: string;
  phone: string;
  batch: number;
}): Promise<RegistrationData> {
  if (!params.token || params.token.trim().length < 6) {
    throw new Error('6-digit OTP code enter karo.');
  }

  if (supabase) {
    // Verify OTP token with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      email: params.email.trim(),
      token: params.token.trim(),
      type: 'email',
    });

    if (authError) {
      throw new Error(authError.message || 'Galat ya expired OTP. Dobara check karo.');
    }

    const userId = authData.user?.id;
    if (!userId) {
      throw new Error('User authentication verification failed.');
    }

    // Insert into registrations table
    const regPayload = {
      user_id: userId,
      full_name: params.fullName.trim(),
      email: params.email.trim(),
      phone: params.phone.trim(),
      batch: params.batch,
    };

    const { data: regData, error: regError } = await supabase
      .from('registrations')
      .upsert(regPayload, { onConflict: 'user_id' })
      .select()
      .single();

    if (regError) {
      throw new Error(`Database error: ${regError.message}`);
    }

    return regData;
  }

  // Demo fallback
  if (params.token.trim() !== '123456' && params.token.trim().length !== 6) {
    throw new Error('Invalid demo OTP. Use 123456.');
  }

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

// 3. Verify OTP for Login
export async function verifyOtpAndSignIn(params: {
  email: string;
  token: string;
}): Promise<RegistrationData | null> {
  if (!params.token || params.token.trim().length < 6) {
    throw new Error('6-digit OTP code enter karo.');
  }

  if (supabase) {
    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      email: params.email.trim(),
      token: params.token.trim(),
      type: 'email',
    });

    if (authError) {
      throw new Error(authError.message || 'Galat ya expired OTP.');
    }

    const userId = authData.user?.id;
    if (!userId) throw new Error('Authentication failed');

    const reg = await getExistingRegistration(userId);
    return reg;
  }

  // Demo fallback
  const localReg = localStorage.getItem('tgpcop_fresher_registered_user');
  if (localReg) {
    const parsed = JSON.parse(localReg);
    if (parsed.email.toLowerCase() === params.email.trim().toLowerCase()) {
      return parsed;
    }
  }
  throw new Error('No registration found for this email in demo mode. Please Sign Up first.');
}

// 4. Save/Update Registration Details (for authenticated user)
export async function saveRegistrationDetails(params: {
  fullName: string;
  phone: string;
  batch: number;
  email: string;
}): Promise<RegistrationData> {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User authenticate nahi hua hai. Pehle OTP verify karo.');
    }

    const regPayload = {
      user_id: user.id,
      full_name: params.fullName.trim(),
      email: params.email.trim(),
      phone: params.phone.trim(),
      batch: params.batch,
    };

    const { data, error } = await supabase
      .from('registrations')
      .upsert(regPayload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  }

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

// Backward compatibility helpers
export async function registerStudent(params: {
  fullName: string;
  phone: string;
  batch: number;
  email: string;
  password?: string;
}): Promise<RegistrationData> {
  return verifyOtpAndRegister({
    email: params.email,
    token: '123456',
    fullName: params.fullName,
    phone: params.phone,
    batch: params.batch,
  });
}

export async function signInStudent(params: {
  email: string;
  password?: string;
}): Promise<RegistrationData | null> {
  return verifyOtpAndSignIn({
    email: params.email,
    token: '123456',
  });
}

// Student sign out
export async function signOutStudent(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut();
  }
  localStorage.removeItem('tgpcop_fresher_registered_user');
}

