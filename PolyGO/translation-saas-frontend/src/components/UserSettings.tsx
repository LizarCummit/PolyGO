'use client';

import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { UserService } from '../services/userService';
import { UserSettings as UserSettingsType } from '../types/user';

export function UserSettings() {
  const { user, refreshUser } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserSettingsType>({
    id: user?.settings?.id || '',
    user_id: user?.id || '',
    email_notifications: user?.settings?.email_notifications ?? true,
    transcription_language: user?.settings?.transcription_language || 'en',
    theme: user?.settings?.theme || 'light',
    created_at: user?.settings?.created_at || new Date().toISOString(),
    updated_at: user?.settings?.updated_at || new Date().toISOString()
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      await UserService.updateSettings(user.id, formData);
      await refreshUser();
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Please log in to view your settings.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Settings</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Edit Settings
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
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.email_notifications}
                onChange={(e) => setFormData({ ...formData, email_notifications: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Email Notifications
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Transcription Language
            </label>
            <select
              value={formData.transcription_language}
              onChange={(e) => setFormData({ ...formData, transcription_language: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="ru">Russian</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Theme
            </label>
            <select
              value={formData.theme}
              onChange={(e) => setFormData({ ...formData, theme: e.target.value as 'light' | 'dark' | 'system' })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
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
          <div>
            <h3 className="text-lg font-medium text-gray-900">Email Notifications</h3>
            <p className="mt-1 text-gray-600">
              {user.settings?.email_notifications ? 'Enabled' : 'Disabled'}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900">Transcription Language</h3>
            <p className="mt-1 text-gray-600">
              {(user.settings?.transcription_language || 'en').toUpperCase()}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900">Theme</h3>
            <p className="mt-1 text-gray-600">
              {(user.settings?.theme || 'light').charAt(0).toUpperCase() + (user.settings?.theme || 'light').slice(1)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 