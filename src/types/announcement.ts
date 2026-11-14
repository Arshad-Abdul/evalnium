export type AnnouncementCategory = 'bulletin' | 'exam' | 'notice' | 'alert';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  category?: AnnouncementCategory; // 'bulletin' | 'exam' | 'notice' | 'alert'
  showTimer?: boolean; // Live countdown timer for upcoming scheduled exams/notices
  scheduledDateTime: string; // ISO string e.g. "2026-08-10T10:00:00"
  targetQuizId?: string;
  targetTopic?: string;
  isActive: boolean;
  createdAt: string;
}
