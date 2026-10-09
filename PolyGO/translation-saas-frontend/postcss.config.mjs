import postcssImport from "postcss-import";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

export default {
  plugins: {
    "postcss-import": {},
    "tailwindcss": {}, // ✅ Correct Tailwind CSS plugin
    "autoprefixer": {},
  },
};
