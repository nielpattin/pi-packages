import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
   resolve: {
      alias: {
         "#src": path.resolve(import.meta.dirname, "src"),
         "#test": path.resolve(import.meta.dirname, "test"),
      },
   },
   test: {
      environment: "node",
      globals: true,
      include: ["test/**/*.test.ts"],
   },
});
