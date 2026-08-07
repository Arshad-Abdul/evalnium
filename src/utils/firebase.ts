/**
 * Firebase Firestore & Auth SDK Configuration Helper
 * 
 * Evalnium supports real-time Cloud Database synchronization via Firebase.
 * To activate live cloud database across all global users:
 * 1. Create a free project at https://console.firebase.google.com
 * 2. Copy your web app config keys below into your environment or directly in this file.
 */

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSy_EVALNIUM_DEMO_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "evalnium.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "evalnium-prod",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "evalnium-prod.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456"
};

/**
 * Recommended Firestore Security Rules Template:
 * 
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     // Quizzes collection: Everyone can read, only Admin can write
 *     match /quizzes/{quizId} {
 *       allow read: if true;
 *       allow write: if request.auth != null && request.auth.token.admin == true;
 *     }
 *     // Leaderboard & Exam Results: Everyone can read, registered users can submit results
 *     match /leaderboard/{resultId} {
 *       allow read: if true;
 *       allow create: if request.auth != null || request.resource.data.candidateName != null;
 *     }
 *   }
 * }
 */
