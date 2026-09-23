import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, UserProfile, cleanPhone, SESSION_TOKEN_KEY } from '../lib/api';

export type UserRole = 'student' | 'admin';
export type UserStatus = 'pending' | 'active' | 'inactive' | 'rejected' | 'incomplete';

export interface AppUser {
  id?: string;
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
        let latestProfile: UserProfile | undefined;
        try {
          latestProfile = await api.getMyProfile();
        } catch (e: any) {
          // If admin, fallback to api.getUsers()
          if (savedUser.role === 'admin') {
            const allUsers = await api.getUsers();
            latestProfile = allUsers.find(u => String(u.id).trim() === String(savedUser.uid).trim() || cleanPhone(u.phone) === cleanPhone(savedUser.phone || ''));
          } else {
            throw e;
          }
        }

        if (latestProfile) {
          const appUser = mapUserProfileToUser(latestProfile);
          setUser(appUser);
          localStorage.setItem(SESSION_KEY, JSON.stringify(appUser));
        } else {
          console.warn("Logged-in user not found in database. Clearing stale session...");
          setUser(null);
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(SESSION_TOKEN_KEY);
        }
      } catch (err: any) {
        console.error("Failed to sync user session from server on mount:", err);
        if (err?.code === 401 || err?.code === 403 || err?.message?.includes("Unauthorized") || err?.message?.includes("suspended")) {
          setUser(null);
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(SESSION_TOKEN_KEY);
        }
      }
    };

    try {
      const savedUserStr = localStorage.getItem(SESSION_KEY);
      const savedToken = localStorage.getItem(SESSION_TOKEN_KEY);
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        // If legacy session without token, require clean re-login
        if (!savedToken) {
          console.warn("Legacy session detected without session token. Clearing for re-login...");
          setUser(null);
          localStorage.removeItem(SESSION_KEY);
          setLoading(false);
          return;
        }
        setUser(savedUser);
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
      monthlyFee: (() => {
        if (profile.monthlyFee === undefined || profile.monthlyFee === null) return 500;
        const s = String(profile.monthlyFee).trim();
        if (s === '') return 500;
        const val = Number(s);
        return isNaN(val) ? 500 : val;
      })(),
      pendingMonths: (() => {
        if (profile.pendingMonths === undefined || profile.pendingMonths === null) return 0;
        const s = String(profile.pendingMonths).trim();
        if (s === '') return 0;
        const val = Number(s);
        return isNaN(val) ? 0 : val;
      })(),
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
      if (profile.sessionToken) {
        localStorage.setItem(SESSION_TOKEN_KEY, profile.sessionToken);
      }
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
    localStorage.removeItem(SESSION_TOKEN_KEY);
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
