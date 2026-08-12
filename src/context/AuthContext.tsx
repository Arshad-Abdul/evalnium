import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile } from '../types/auth';

interface AuthContextType {
  currentUser: UserProfile | null;
  isAdminAuthenticated: boolean;
  registerCandidate: (name: string, email: string) => Promise<UserProfile>;
  loginCandidate: (email: string, name?: string) => Promise<UserProfile>;
  checkCandidateExists: (email: string) => Promise<boolean>;
  loginAdmin: (passcode: string) => boolean;
  logoutAdmin: () => void;
  logoutCandidate: () => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
}

const AUTH_USER_KEY = 'evalnium_current_user_v1';
const ADMIN_AUTH_KEY = 'evalnium_admin_auth_v1';
const MASTER_ADMIN_PASSCODE = 'evalnium_admin_2026';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(ADMIN_AUTH_KEY, isAdminAuthenticated ? 'true' : 'false');
  }, [isAdminAuthenticated]);

  const getApiUrl = () => {
    const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
    return `http://${host}:5050/api/users`;
  };

  const registerCandidate = async (name: string, email: string, password?: string): Promise<UserProfile> => {
    const uid = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const payload = {
      uid,
      name: name.trim() || 'Candidate',
      email: email.trim().toLowerCase(),
      password: password || '',
    };
    
    const res = await fetch(`${getApiUrl()}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
      totalExamsTaken: 0,
      createdAt: new Date().toISOString()
    };

    setCurrentUser(newUser);
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
      targetExam: data.targetExam,
      phone: data.phone,
      institution: data.institution,
      createdAt: data.createdAt,
    };
    
    setCurrentUser(user);
    return user;
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
  };

  const loginAdmin = (passcode: string): boolean => {
    if (passcode.trim() === MASTER_ADMIN_PASSCODE || passcode.trim() === 'admin123') {
      setIsAdminAuthenticated(true);
      if (currentUser) {
        setCurrentUser({ ...currentUser, role: 'admin' });
      }
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    if (currentUser) {
      setCurrentUser({ ...currentUser, role: 'candidate' });
    }
  };

  const logoutCandidate = () => {
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAdminAuthenticated,
        registerCandidate,
        loginCandidate,
        checkCandidateExists,
        loginAdmin,
        logoutAdmin,
        logoutCandidate,
        updateUserProfile,
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
