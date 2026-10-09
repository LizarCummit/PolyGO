export type UserRole = 'free' | 'premium' | 'admin';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_active_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  email_notifications: boolean;
  transcription_language: string;
  theme: 'light' | 'dark' | 'system';
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  role: UserRole;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: 'active' | 'inactive' | 'cancelled' | 'past_due';
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string | undefined;
  profile: UserProfile | null;
  settings: UserSettings | null;
  subscription: UserSubscription | null;
  created_at: string;
  last_sign_in_at: string | null;
} 