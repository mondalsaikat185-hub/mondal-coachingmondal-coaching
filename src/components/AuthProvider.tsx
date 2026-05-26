import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, UserProfile } from '../lib/api';

export type UserRole = 'student' | 'admin';
export type UserStatus = 'pending' | 'active' | 'inactive' | 'rejected' | 'incomplete';

export interface AppUser {
  uid: string; // Maps to user.id
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  fullName?: string;
  address?: string;
  dob?: string;
  joinDate?: string;
  phone?: string;
  batchId?: string;
  isProfileComplete?: boolean;
  profilePhotoUrl?: string;
  monthlyFee?: number | null;
  pendingMonths?: number | null;
  showPaymentNudge?: boolean;
  exemptReason?: string | null;
  passcode?: string;
  paymentStatus?: string;
  reapplyReason?: string;
  excusedDates?: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  login: (phone: string, passcode: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateLocalUser: (updates: Partial<AppUser>) => void;
  setError: (err: string | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  login: async () => false,
  logout: async () => {},
  updateLocalUser: () => {},
  setError: () => {},
});

export const useAuth = () => useContext(AuthContext);

const SESSION_KEY = "mc_session_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync session on mount with background refresh from Sheets database
  useEffect(() => {
    const fetchLatestUser = async (savedUser: AppUser) => {
      try {
        const allUsers = await api.getUsers();
        const latestProfile = allUsers.find(u => u.id === savedUser.uid);
        if (latestProfile) {
          const appUser = mapUserProfileToUser(latestProfile);
          setUser(appUser);
          localStorage.setItem(SESSION_KEY, JSON.stringify(appUser));
        }
      } catch (err) {
        console.error("Failed to sync user session from server on mount:", err);
      }
    };

    try {
      const savedUserStr = localStorage.getItem(SESSION_KEY);
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        setUser(savedUser);
        
        // Fetch latest user data in the background to keep cache fresh
        fetchLatestUser(savedUser);
      }
    } catch (e) {
      console.error("Failed to load saved session", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Map API UserProfile to frontend AppUser format
  const mapUserProfileToUser = (profile: UserProfile): AppUser => {
    return {
      uid: profile.id,
      email: profile.email || '',
      displayName: profile.name || 'Student',
      photoURL: profile.profilePhotoUrl || null,
      role: profile.role || 'student',
      status: profile.status || 'incomplete',
      createdAt: profile.createdAt || new Date().toISOString(),
      updatedAt: profile.updatedAt || new Date().toISOString(),
      fullName: profile.name,
      address: profile.address,
      dob: profile.dob,
      joinDate: profile.joinDate,
      phone: profile.phone,
      batchId: profile.batchId,
      isProfileComplete: profile.status !== 'incomplete',
      profilePhotoUrl: profile.profilePhotoUrl,
      monthlyFee: profile.monthlyFee !== undefined ? Number(profile.monthlyFee) : 500,
      pendingMonths: profile.pendingMonths !== undefined ? Number(profile.pendingMonths) : 0,
      passcode: profile.passcode,
      paymentStatus: profile.paymentStatus,
      reapplyReason: profile.reapplyReason,
      excusedDates: profile.excusedDates || '',
      exemptReason: profile.exemptReason || ''
    };
  };

  const login = async (phone: string, passcode: string): Promise<boolean> => {
    setError(null);
    setLoading(true);
    try {
      const profile = await api.loginUser(phone, passcode);
      const appUser = mapUserProfileToUser(profile);
      
      setUser(appUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(appUser));
      setLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || "লগইন ব্যর্থ হয়েছে। সঠিক ফোন নম্বর এবং পাসকোড দিন।");
      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const updateLocalUser = (updates: Partial<AppUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, updateLocalUser, setError }}>
      {children}
    </AuthContext.Provider>
  );
}
