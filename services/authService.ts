
import { LoginRequest, LoginResponse, Role } from '../types';
import { supabase } from './supabaseClient';
import { offlineStore } from './offlineStore';

const AUTH_CACHE_PREFIX = 'auth_session_';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (fn: () => Promise<any>, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await fn();
      if (result.error && (result.error.message?.includes('fetch') || result.error.message?.includes('network'))) {
        throw result.error;
      }
      return result;
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(delay);
    }
  }
};

// This function is no longer needed for OTP but kept empty to prevent import errors in other files if any
export const checkUserStatus = async (mobile: string) => {
    return { exists: true, status: 'approved' };
};

export const loginUser = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const { mobile, password } = credentials;

  // --- 0. OFFLINE HANDLER ---
  if (!navigator.onLine) {
      console.log("Offline mode detected. Attempting local login...");
      try {
          const cachedSession = await offlineStore.get<any>(AUTH_CACHE_PREFIX + mobile);
          
          if (cachedSession && cachedSession.password === password) {
              return {
                  status: 'success',
                  message: 'Login Successful (Offline Mode)',
                  role: cachedSession.role,
                  user_role: cachedSession.role,
                  user_name: cachedSession.name,
                  user_id: cachedSession.id,
                  school_db_id: cachedSession.school_db_id
              };
          }
          return { status: 'error', message: 'You are offline and no local session found for these credentials.' };
      } catch (e) {
          return { status: 'error', message: 'Offline login failed due to storage error.' };
      }
  }

  try {
    // --- 1. CHECK FOR ADMIN ---
    // Logic: If mobile matches admin, treat 'password' input as 'secret_code'
    let adminResult;
    try {
        adminResult = await fetchWithRetry(() => 
          supabase
          .from('admins')
          .select('*')
          .eq('mobile', mobile)
          .maybeSingle()
        );
    } catch (err: any) { adminResult = { error: err, data: null }; }

    if (adminResult.data) {
      // Check Secret Code
      if (adminResult.data.secret_code === password) {
          console.log("Admin Login Successful");
          
          // Cache Session for Offline
          await offlineStore.set(AUTH_CACHE_PREFIX + mobile, {
              mobile,
              password,
              role: 'admin',
              name: adminResult.data.name,
              id: adminResult.data.id,
              school_db_id: null
          });

          return {
            status: 'success',
            role: 'admin',
            user_role: 'admin',
            user_name: adminResult.data.name,
            user_id: adminResult.data.id
          };
      } else {
          // Found admin but wrong code
          return { status: 'error', message: 'Invalid Admin Secret Code.' };
      }
    }

    // --- 2. CHECK FOR STANDARD USER ---
    // If not admin, check users table and verify password
    let userResult;
    try {
        userResult = await fetchWithRetry(() => 
            supabase
              .from('users')
              .select('id, name, role, password, subscription_end_date, school_id, approval_status, schools:school_id (id, name, is_active, subscription_end_date, school_code)')
              .eq('mobile', mobile)
              .maybeSingle()
        );
    } catch (e: any) {
        userResult = { error: e, data: null };
    }

    const { data: userData, error: userError } = userResult;

    if (userError) return { status: 'error', message: `Login failed: ${userError.message}` };
    
    if (!userData) {
        return { status: 'error', message: 'Account not found. Please Register first.' };
    }

    // Verify Password
    // Note: In production, passwords should be hashed. For this stage, we compare directly.
    if (userData.password !== password) {
        return { status: 'error', message: 'Incorrect Password.' };
    }

    // Check Approval Status
    if (userData.approval_status === 'pending') {
        return { status: 'error', message: 'Account awaiting Principal approval.' };
    }
    if (userData.approval_status === 'rejected') {
        return { status: 'blocked', message: 'Account rejected by administration.' };
    }

    // Extract School Data
    // @ts-ignore
    const schoolData = userData.schools;
    if (!schoolData) return { status: 'error', message: 'Account not linked to any valid school.' };

    credentials.school_id = schoolData.school_code;

    // Cache Session for Offline
    await offlineStore.set(AUTH_CACHE_PREFIX + mobile, {
        mobile,
        password,
        role: userData.role,
        name: userData.name,
        id: userData.id,
        school_db_id: schoolData.id
    });

    return {
      status: 'success',
      message: 'Login Successful',
      role: userData.role as Role,
      user_role: userData.role as Role,
      user_name: userData.name,
      user_id: userData.id,
      school_db_id: schoolData.id
    };

  } catch (error: any) {
    console.error("Critical Exception:", error);
    return { status: 'error', message: error.message || 'Unexpected network error.' };
  }
};

export const updateUserToken = async (userId: string, token: string) => {
  try {
    await supabase.from('users').update({ fcm_token: token }).eq('id', userId);
  } catch (error) {}
};

export const fetchPendingApprovals = async (schoolId: string) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, role, mobile, created_at, students!parent_user_id(name, class_name)')
            .eq('school_id', schoolId)
            .eq('approval_status', 'pending')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error("Fetch Pending Error", e);
        return [];
    }
};

export const updateUserApprovalStatus = async (userId: string, status: 'approved' | 'rejected') => {
    try {
        const { error } = await supabase
            .from('users')
            .update({ approval_status: status })
            .eq('id', userId);
        return !error;
    } catch (e) {
        return false;
    }
};
