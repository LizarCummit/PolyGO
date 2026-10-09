// Importing metadata type from Next.js
import type { Metadata } from 'next';

// Importing Google Fonts with automatic optimization
import { Inter } from 'next/font/google';

// ✅ FIXED: Correct path to the global CSS file based on your folder structure
import './globals.css';

// ✅ Correct import paths now that components are under src/components/
import { UserProvider } from '@/contexts/UserContext';
import { AuthProvider } from '@/app/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';
import DevBypass from './components/DevBypass';

// ✅ Loading the Google Fonts with CSS variable support
const inter = Inter({ subsets: ['latin'] });

// ✅ Metadata for SEO and social previews
export const metadata: Metadata = {
  title: 'PolyGO - Lecture Processing Platform',
  description: 'Process and analyze your lectures with AI',
};

// ✅ Root layout function that wraps the entire application
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <UserProvider>
            <Navigation />
            <main className="container mx-auto px-4 py-6">
              {children}
            </main>
            <DevBypass />
          </UserProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
