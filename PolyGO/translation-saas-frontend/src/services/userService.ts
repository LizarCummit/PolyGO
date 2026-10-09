import { createClient } from '@supabase/supabase-js';
import { User, UserProfile, UserSettings, UserSubscription } from '../types/user';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export class UserService {
  static async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const [profile, settings, subscription] = await Promise.all([
      this.getUserProfile(user.id),
      this.getUserSettings(user.id),
      this.getUserSubscription(user.id)
    ]);

    return {
      id: user.id,
      email: user.email || '',
      profile,
      settings,
      subscription,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at
    };
  }

  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  }

  static async getUserSettings(userId: string): Promise<UserSettings | null> {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user settings:', error);
      return null;
    }

    return data;
  }

  static async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user subscription:', error);
      return null;
    }

    return data;
  }

  static async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      return null;
    }

    return data;
  }

  static async updateSettings(userId: string, updates: Partial<UserSettings>): Promise<UserSettings | null> {
    const { data, error } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user settings:', error);
      return null;
    }

    return data;
  }

  static async createUserProfile(userId: string, profile: Omit<UserProfile, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'last_active_at'>): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert([{ ...profile, user_id: userId }])
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error);
      return null;
    }

    return data;
  }

  static async createUserSettings(userId: string): Promise<UserSettings | null> {
    const { data, error } = await supabase
      .from('user_settings')
      .insert([{ user_id: userId }])
      .select()
      .single();

    if (error) {
      console.error('Error creating user settings:', error);
      return null;
    }

    return data;
  }

  static async createUserSubscription(userId: string): Promise<UserSubscription | null> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .insert([{ user_id: userId }])
      .select()
      .single();

    if (error) {
      console.error('Error creating user subscription:', error);
      return null;
    }

    return data;
  }

  static async initializeUser(userId: string): Promise<boolean> {
    try {
      await Promise.all([
        this.createUserProfile(userId, {
          full_name: null,
          avatar_url: null,
          bio: null,
          preferences: {}
        }),
        this.createUserSettings(userId),
        this.createUserSubscription(userId)
      ]);
      return true;
    } catch (error) {
      console.error('Error initializing user:', error);
      return false;
    }
  }
} 