'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Create a client-side only wrapper for the charts
const Charts = dynamic(() => import('@/app/components/Charts'), { ssr: false });

interface UsageData {
  transcriptionMinutes: number;
  translationCount: number;
  storageUsed: number;
  transcriptionLimit: number;
  translationLimit: number;
  storageLimit: number;
}

interface ActivityData {
  date: string;
  transcriptions: number;
  translations: number;
}

export default function Analytics() {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await response.json();
      setUsageData(data.usageData);
      setActivityData(data.activityData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading analytics...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!usageData) return <div>No data available</div>;

  return <Charts usageData={usageData} activityData={activityData} />;
} 