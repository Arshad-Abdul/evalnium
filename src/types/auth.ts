export type UserRole = 'admin' | 'candidate';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  targetExam?: string;
  phone?: string;
  institution?: string;
  totalExamsTaken?: number;
  createdAt: string;
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
}
