'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserProvider, useUser } from '@/contexts/UserContext';
import { UserProfile } from '@/components/UserProfile';
import { UserSettings } from '@/components/UserSettings';

function AccountPage() {
  const router = useRouter();
  const { user, loading } = useUser();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Account Settings</h1>
      <div className="space-y-8">
        <UserProfile />
        <UserSettings />
      </div>
    </div>
  );
}

export default function AccountPageWrapper() {
  return (
    <UserProvider>
      <AccountPage />
    </UserProvider>
  );
} 