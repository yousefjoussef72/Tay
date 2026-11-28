import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(projectRoot, "physics-lab"),
  base: "/physics-lab/",
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "physics-lab/src"),
    },
  },
  build: {
    outDir: path.resolve(projectRoot, "dist/physics-lab"),
    emptyOutDir: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/three/")) return "three-vendor";
          if (id.includes("/node_modules/react-dom/") || id.includes("/node_modules/react/")) return "react-vendor";
        },
      },
    },
  },
});
