export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"], // ✅ Ensures Tailwind scans all files
  theme: {
    extend: {},
  },
  plugins: [],
};


//cd C:\Users\Administrator\PolyGO\translation-saas-frontend
//#Remove Next.js cache
//Remove-Item -Recurse -Force .next
//#Remove node_modules
//Remove-Item -Recurse -Force node_modules
//#Remove pnpm lock file
//Remove-Item -Force pnpm-lock.yaml
