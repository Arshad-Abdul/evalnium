import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile } from '../types/auth';

interface AuthContextType {
  currentUser: UserProfile | null;
  isAdminAuthenticated: boolean;
  registerCandidate: (name: string, email: string, password?: string) => Promise<UserProfile>;
  loginCandidate: (email: string, name?: string) => Promise<UserProfile>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
  checkCandidateExists: (email: string) => Promise<boolean>;
  loginAdmin: (passcode: string) => Promise<boolean>;
  logoutAdmin: () => void;
  logoutCandidate: () => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const res = await fetch(`${getApiUrl()}/me`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.currentUser) {
            setCurrentUser(data.currentUser);
          }
          if (data.isAdminAuthenticated) {
            setIsAdminAuthenticated(true);
          }
        }
      } catch (err) {
        console.error('Session recovery failed:', err);
      }
    };
    verifySession();
  }, []);

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
      targetExam: data.targetExam,
      phone: data.phone,
      institution: data.institution,
      createdAt: data.createdAt,
    };
    
    setCurrentUser(user);
    return user;
  };

  const resetPassword = async (email: string, otp: string, newPassword: string): Promise<void> => {
    const res = await fetch(`${getApiUrl()}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword 
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to reset password');
    }
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
  };

  const loginAdmin = async (passcode: string): Promise<boolean> => {
    try {
      const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
      const res = await fetch(`http://${host}:5050/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
        credentials: 'include',
      });
      if (res.ok) {
        setIsAdminAuthenticated(true);
        if (currentUser) {
          setCurrentUser({ ...currentUser, role: 'admin' });
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logoutAdmin = () => {
    const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
    fetch(`http://${host}:5050/api/users/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    }).catch(e => console.error('Logout request failed:', e));

    setIsAdminAuthenticated(false);
    if (currentUser) {
      setCurrentUser({ ...currentUser, role: 'candidate' });
    }
  };

  const logoutCandidate = () => {
    const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
    fetch(`http://${host}:5050/api/users/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    }).catch(e => console.error('Logout request failed:', e));

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
