import { supabase } from './supabaseClient';
import { ClassFeeStructure, StudentFeeProfile, FeeTransaction } from '../types';

export const fetchClassFeeStructures = async (schoolId: string, academicYear: string): Promise<ClassFeeStructure[]> => {
  const { data, error } = await supabase
    .from('class_fee_structures')
    .select('*')
    .eq('school_id', schoolId)
    .eq('academic_year', academicYear);
  if (error) {
    console.error('Error fetching fee structures:', error);
    return [];
  }
  return data || [];
};

export const saveClassFeeStructure = async (structure: Partial<ClassFeeStructure>): Promise<boolean> => {
  const { error } = await supabase
    .from('class_fee_structures')
    .upsert(structure, { onConflict: 'school_id, class_name, academic_year' });
  if (error) {
    console.error('Error saving fee structure:', error);
    return false;
  }
  return true;
};

export const fetchStudentFeeProfiles = async (schoolId: string): Promise<StudentFeeProfile[]> => {
  const { data, error } = await supabase
    .from('student_fee_profiles')
    .select('*')
    .eq('school_id', schoolId);
  if (error) {
    console.error('Error fetching student fee profiles:', error);
    return [];
  }
  return data || [];
};

export const saveStudentFeeProfile = async (profile: Partial<StudentFeeProfile>): Promise<boolean> => {
  const { error } = await supabase
    .from('student_fee_profiles')
    .upsert(profile, { onConflict: 'student_id' });
  if (error) {
    console.error('Error saving student fee profile:', error);
    return false;
  }
  return true;
};

export const fetchFeeTransactions = async (schoolId: string): Promise<FeeTransaction[]> => {
  const { data, error } = await supabase
    .from('fee_transactions')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching fee transactions:', error);
    return [];
  }
  return data || [];
};

export const addFeeTransaction = async (transaction: Partial<FeeTransaction>): Promise<boolean> => {
  const { error } = await supabase
    .from('fee_transactions')
    .insert([transaction]);
  if (error) {
    console.error('Error adding fee transaction:', error);
    return false;
  }
  return true;
};
