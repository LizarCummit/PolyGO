'use client';

import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { UserService } from '../services/userService';
import { UserProfile as UserProfileType } from '../types/user';

interface ProfileFormData {
  full_name: string;
  avatar_url: string;
  bio: string;
  preferences: Record<string, any>;
}

export function UserProfile() {
  const { user, refreshUser } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: user?.profile?.full_name || '',
    avatar_url: user?.profile?.avatar_url || '',
    bio: user?.profile?.bio || '',
    preferences: user?.profile?.preferences || {}
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      await UserService.updateProfile(user.id, formData);
      await refreshUser();
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Please log in to view your profile.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Profile</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Edit Profile
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Avatar URL
            </label>
            <input
              type="url"
              value={formData.avatar_url}
              onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {user.profile?.avatar_url && (
            <div className="flex justify-center">
              <img
                src={user.profile.avatar_url}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover"
              />
            </div>
          )}

          <div>
            <h3 className="text-lg font-medium text-gray-900">Full Name</h3>
            <p className="mt-1 text-gray-600">
              {user.profile?.full_name || 'Not set'}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900">Bio</h3>
            <p className="mt-1 text-gray-600">
              {user.profile?.bio || 'No bio yet'}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900">Email</h3>
            <p className="mt-1 text-gray-600">{user.email}</p>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900">Subscription</h3>
            <p className="mt-1 text-gray-600">
              {user.subscription?.role ? 
                user.subscription.role.charAt(0).toUpperCase() + user.subscription.role.slice(1) : 
                'Free'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 