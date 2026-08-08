export interface Announcement {
  id: string;
  title: string;
  message: string;
  scheduledDateTime: string; // ISO string e.g. "2026-08-10T10:00:00"
  targetQuizId?: string;
  targetTopic?: string;
  isActive: boolean;
  createdAt: string;
}
