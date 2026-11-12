import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  // Vite exposes only VITE_* variables, and only to client code. Server code
  // (Knock, Postmark) reads process.env, so copy every .env entry there too.
  // A variable already set in the real environment wins.
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ""))) {
    process.env[key] ??= value;
  }

  return {
    plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  };
});
