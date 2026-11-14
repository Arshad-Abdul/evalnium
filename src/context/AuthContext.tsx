import React, { createContext, useContext, useState, useEffect } from 'react';
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
    return '/api/users';
  };

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
    };
    setCurrentUser(updatedUser);
    return updatedUser;
  };

  const loginAdmin = async (passcode: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
        credentials: 'include',
      });
      if (res && res.ok) {
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
    const clientId = typeof window !== 'undefined' ? localStorage.getItem('evalnium_client_id') : null;
    fetch('/api/users/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
      credentials: 'include',
    }).catch(e => console.error('Logout request failed:', e));

    setIsAdminAuthenticated(false);
    if (currentUser) {
      setCurrentUser({ ...currentUser, role: 'candidate' });
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
