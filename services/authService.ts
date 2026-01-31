
import { LoginRequest, LoginResponse, Role } from '../types';
import { supabase } from './supabaseClient';

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

// NEW: Check if user exists and is approved BEFORE sending OTP
export const checkUserStatus = async (mobile: string): Promise<{ exists: boolean; status: string; message?: string }> => {
  try {
    // First check admins (bypass approval logic for admins)
    const { data: admin } = await supabase.from('admins').select('id').eq('mobile', mobile).maybeSingle();
    if (admin) return { exists: true, status: 'approved' };

    // Check Users
    const { data: user } = await supabase
      .from('users')
      .select('approval_status')
      .eq('mobile', mobile)
      .maybeSingle();

    if (!user) return { exists: false, status: 'not_found' };
    
    // Check Status
    if (user.approval_status === 'pending') {
      return { exists: true, status: 'pending', message: 'Account is awaiting Principal approval.' };
    }
    if (user.approval_status === 'rejected') {
      return { exists: true, status: 'rejected', message: 'Account has been rejected by the school.' };
    }

    return { exists: true, status: 'approved' };
  } catch (e) {
    console.error("Check Status Error", e);
    return { exists: false, status: 'error' };
  }
};

export const loginUser = async (credentials: LoginRequest): Promise<LoginResponse> => {
  try {
    // Check if browser is offline
    if (!navigator.onLine) {
      return { status: 'error', message: 'You are offline. Please check your internet connection.' };
    }

    // --- ADMIN LOGIN LOGIC (Secret Code) ---
    if (credentials.secret_code && credentials.secret_code.trim() !== '') {
      console.log("Connecting to Supabase for Admin login...");
      let adminData, adminError;
      try {
          const result = await fetchWithRetry(() => 
            supabase
            .from('admins')
            .select('*')
            .eq('mobile', credentials.mobile)
            .eq('secret_code', credentials.secret_code)
            .maybeSingle()
          );
          adminData = result.data;
          adminError = result.error;
      } catch (err: any) { adminError = err; }

      if (adminError) return { status: 'error', message: `Database Error: ${adminError.message}` };
      if (!adminData) return { status: 'error', message: 'Invalid Admin Credentials' };

      return {
        status: 'success',
        role: 'admin',
        user_role: 'admin',
        user_name: adminData.name,
        user_id: adminData.id
      };
    }

    // --- USER LOGIN LOGIC (OTP Verified) ---
    // Note: Password check is removed for standard users as they are verified via OTP.
    
    let userResult;
    try {
        userResult = await fetchWithRetry(() => 
            supabase
              .from('users')
              .select('id, name, role, subscription_end_date, school_id, approval_status, schools:school_id (id, name, is_active, subscription_end_date, school_code)')
              .eq('mobile', credentials.mobile)
              .maybeSingle()
        );
    } catch (e: any) {
        userResult = { error: e, data: null };
    }

    const { data: userData, error: userError } = userResult;

    if (userError) return { status: 'error', message: `Login failed: ${userError.message}` };
    if (!userData) return { status: 'error', message: 'Mobile number not registered.' };

    // Double Check Approval Status (Security Layer)
    if (userData.approval_status === 'pending') {
        return { status: 'error', message: 'Account is pending approval from Principal.' };
    }
    if (userData.approval_status === 'rejected') {
        return { status: 'blocked', message: 'Account access blocked by administration.' };
    }

    // Extract School Data
    // @ts-ignore
    const schoolData = userData.schools;
    if (!schoolData) return { status: 'error', message: 'Account not linked to any valid school.' };

    credentials.school_id = schoolData.school_code;

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

// NEW: Fetch pending users for Principal Approval
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

// NEW: Approve or Reject user
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
