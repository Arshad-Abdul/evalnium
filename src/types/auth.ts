export type UserRole = 'admin' | 'candidate';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatarUrl?: string;
  targetExam?: string;
  phone?: string;
  institution?: string;
  gender?: string;
  occupationStatus?: string;
  designation?: string;
  universityInstitute?: string;
  city?: string;
  address?: string;
  totalExamsTaken?: number;
  createdAt: string;
}

export interface CandidateRegistrationData {
  phone: string;
  city: string;
  gender?: string;
  occupation_status?: string;
  designation?: string;
  university_institute?: string;
  address?: string;
  target_exam?: string;
}

export interface AuthContextType {
  currentUser: UserProfile | null;
  isAdminAuthenticated: boolean;
  registerCandidate: (name: string, email: string, password?: string, extraData?: CandidateRegistrationData) => Promise<UserProfile>;
  loginCandidate: (email: string, password?: string) => Promise<UserProfile>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
  checkCandidateExists: (email: string) => Promise<boolean>;
  loginAdmin: (passcode: string) => Promise<boolean>;
  logoutAdmin: () => void;
  logoutCandidate: () => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
}

export interface LeaderboardEntry {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  quizId: string;
  quizTitle: string;
  topic: string;
  score: number;
  maxScore: number;
  percentage: number;
  timeSpentSeconds: number;
  attemptedAt: string;
  attemptsCount?: number;
}
