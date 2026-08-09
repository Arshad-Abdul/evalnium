import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile } from '../types/auth';

interface AuthContextType {
  currentUser: UserProfile | null;
  isAdminAuthenticated: boolean;
  registerCandidate: (name: string, email: string) => UserProfile;
  loginCandidate: (email: string, name?: string) => UserProfile;
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

  const registerCandidate = (name: string, email: string): UserProfile => {
    const newUser: UserProfile = {
      uid: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: name.trim() || 'Candidate',
      email: email.trim().toLowerCase(),
      role: 'candidate',
      totalExamsTaken: 0,
      createdAt: new Date().toISOString()
    };
    setCurrentUser(newUser);
    return newUser;
  };

  const loginCandidate = (email: string, name?: string): UserProfile => {
    const user: UserProfile = {
      uid: `usr_${Date.now()}`,
      name: name || email.split('@')[0] || 'Candidate',
      email: email.trim().toLowerCase(),
      role: 'candidate',
      createdAt: new Date().toISOString()
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
