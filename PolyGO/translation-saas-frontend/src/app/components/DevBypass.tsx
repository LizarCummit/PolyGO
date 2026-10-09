'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function DevBypass() {
  const [isVisible, setIsVisible] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Only show in development mode
    if (process.env.NODE_ENV === 'development') {
      setIsVisible(true);
      // Check if dev bypass is already enabled
      setIsEnabled(Cookies.get('dev_bypass') === 'true');
    }
  }, []);

  const enableDevBypass = () => {
    // Set the cookie
    Cookies.set('dev_bypass', 'true', { expires: 1 }); // 1 day
    setIsEnabled(true);
    
    // Add the dev_bypass parameter to the current URL
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('dev_bypass', 'true');
    router.push(currentUrl.toString());
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={enableDevBypass}
        className={`${
          isEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'
        } text-white px-4 py-2 rounded-md shadow-md text-sm font-medium`}
      >
        {isEnabled ? 'Dev Bypass Enabled' : 'Enable Dev Bypass'}
      </button>
    </div>
  );
} 