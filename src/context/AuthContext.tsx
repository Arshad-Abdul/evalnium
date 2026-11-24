import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserProfile, CandidateRegistrationData } from '../types/auth';

interface AuthContextType {
  currentUser: UserProfile | null;
  isAdminAuthenticated: boolean;
  registerCandidate: (name: string, email: string, password?: string, extraData?: CandidateRegistrationData, verificationToken?: string) => Promise<UserProfile>;
  loginCandidate: (email: string, password?: string) => Promise<UserProfile>;
  resetPassword: (email: string, otpOrToken: string, newPassword: string) => Promise<void>;
  checkCandidateExists: (email: string) => Promise<boolean>;
  loginAdmin: (passcode: string) => Promise<boolean>;
  logoutAdmin: () => void;
  logoutCandidate: () => void;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  refreshSession: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_CACHE_KEY = 'evalnium_cached_user';

const getInitialUser = (): UserProfile | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(getInitialUser);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);

  const getApiUrl = () => {
    return '/api/users';
  };

  const refreshSession = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const res = await fetch(`${getApiUrl()}/me`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.currentUser) {
          const profile: UserProfile = {
            ...data.currentUser,
            avatarUrl: data.currentUser.avatarUrl || data.currentUser.avatar || undefined,
          };
          setCurrentUser(profile);
          try {
            localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(profile));
          } catch {}
          // STRICT SECURITY: A candidate account can NEVER inherit admin privileges.
          // Only users whose database role is explicitly 'admin' can be admin-authenticated.
          if (profile.role === 'admin' && data.isAdminAuthenticated) {
            setIsAdminAuthenticated(true);
          } else {
            setIsAdminAuthenticated(false);
          }
          return profile;
        } else {
          // Server confirmed no active session
          setCurrentUser(null);
          try {
            localStorage.removeItem(AUTH_USER_CACHE_KEY);
          } catch {}
          if (data.isAdminAuthenticated) {
            setIsAdminAuthenticated(true);
          } else {
            setIsAdminAuthenticated(false);
          }
        }
      }
    } catch (err) {
      console.error('Session recovery failed:', err);
    }
    return null;
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const registerCandidate = async (
    name: string,
    email: string,
    password?: string,
    extraData?: CandidateRegistrationData,
    verificationToken?: string
  ): Promise<UserProfile> => {
    const uid = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const payload = {
      uid,
      name: name.trim() || 'Candidate',
      email: email.trim().toLowerCase(),
      password: password || '',
      verificationToken: verificationToken || '',
      ...(extraData || {})
    };
    
    const res = await fetch(`${getApiUrl()}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to register candidate');
    }

    const resData = await res.json();

    const newUser: UserProfile = {
      uid: resData.user.uid,
      name: resData.user.name,
      email: resData.user.email,
      role: resData.user.role,
      avatarUrl: resData.user.avatarUrl || resData.user.avatar || undefined,
      phone: resData.user.phone,
      gender: resData.user.gender,
      occupationStatus: resData.user.occupationStatus,
      designation: resData.user.designation,
      universityInstitute: resData.user.universityInstitute,
      city: resData.user.city,
      address: resData.user.address,
      targetExam: resData.user.targetExam,
      totalExamsTaken: 0,
      createdAt: new Date().toISOString()
    };

    setCurrentUser(newUser);
    try {
      localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(newUser));
    } catch {}
    setIsAdminAuthenticated(false);
    return newUser;
  };

  const checkCandidateExists = async (email: string): Promise<boolean> => {
    try {
      const res = await fetch(`${getApiUrl()}/check?email=${encodeURIComponent(email)}`);
      if (!res.ok) return false;
      const data = await res.json();
      return data.exists;
    } catch {
      return false;
    }
  };

  const loginCandidate = async (email: string, password?: string): Promise<UserProfile> => {
    const res = await fetch(`${getApiUrl()}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: email.trim().toLowerCase(),
        password: password || ''
      }),
      credentials: 'include',
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error("Account not found. Please create an account first.");
      }
      const data = await res.json();
      throw new Error(data.error || 'Failed to login');
    }

    const data = await res.json();
    const user: UserProfile = {
      uid: data.uid,
      name: data.name,
      email: data.email,
      role: data.role,
      avatarUrl: data.avatarUrl || data.avatar || undefined,
      targetExam: data.targetExam,
      phone: data.phone,
      institution: data.institution,
      gender: data.gender,
      occupationStatus: data.occupationStatus,
      designation: data.designation,
      universityInstitute: data.universityInstitute,
      city: data.city,
      address: data.address,
      createdAt: data.createdAt,
    };
    
    setCurrentUser(user);
    try {
      localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(user));
    } catch {}
    setIsAdminAuthenticated(false);
    return user;
  };

  const resetPassword = async (email: string, otpOrToken: string, newPassword: string): Promise<void> => {
    const isHexToken = /^[a-f0-9]{64}$/i.test(otpOrToken.trim());
    const res = await fetch(`${getApiUrl()}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: email.trim().toLowerCase(),
        ...(isHexToken ? { verificationToken: otpOrToken.trim() } : { otp: otpOrToken.trim() }),
        newPassword 
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to reset password');
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>): Promise<UserProfile> => {
    if (!currentUser) {
      throw new Error('You must be signed in to update your profile.');
    }

    const res = await fetch(`${getApiUrl()}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
      credentials: 'include',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update profile.');
    }

    const updatedUser: UserProfile = {
      ...currentUser,
      ...data.user,
      avatarUrl: data.user?.avatarUrl || data.user?.avatar || updates.avatarUrl || currentUser.avatarUrl,
    };
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(updatedUser));
    } catch {}
    return updatedUser;
  };

  const loginAdmin = async (passcode: string): Promise<boolean> => {
    // STRICT SECURITY: A logged-in student/candidate can NEVER unlock admin privileges.
    if (currentUser && currentUser.role !== 'admin') {
      return false;
    }
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
        credentials: 'include',
      });
      if (res && res.ok) {
        setIsAdminAuthenticated(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logoutAdmin = () => {
    const clientId = typeof window !== 'undefined' ? localStorage.getItem('evalnium_client_id') : null;
    fetch('/api/users/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
      credentials: 'include',
    }).catch(e => console.error('Logout request failed:', e));

    setIsAdminAuthenticated(false);
    if (currentUser && currentUser.role === 'admin') {
      setCurrentUser(null);
      try {
        localStorage.removeItem(AUTH_USER_CACHE_KEY);
      } catch {}
    }
  };

  const logoutCandidate = () => {
    const clientId = typeof window !== 'undefined' ? localStorage.getItem('evalnium_client_id') : null;
    fetch('/api/users/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
      credentials: 'include',
    }).catch(e => console.error('Logout request failed:', e));

    if (typeof window !== 'undefined') {
      localStorage.removeItem('evalnium_client_id');
      localStorage.removeItem(AUTH_USER_CACHE_KEY);
    }
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAdminAuthenticated,
        registerCandidate,
        loginCandidate,
        resetPassword,
        checkCandidateExists,
        loginAdmin,
        logoutAdmin,
        logoutCandidate,
        updateUserProfile,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
