// components/Footer.tsx

export default function Footer() {
    return (
      <footer className="bg-gray-100 dark:bg-gray-800 mt-10">
        <div className="max-w-7xl mx-auto py-4 px-6 text-center text-gray-600 dark:text-gray-300 text-sm">
          &copy; {new Date().getFullYear()} Translation SaaS. All rights reserved.
        </div>
      </footer>
    );
  }
  