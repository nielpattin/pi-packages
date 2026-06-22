import { defineConfig } from "vitest/config";

export default defineConfig({
   test: {
      coverage: {
         provider: "v8",
         reporter: ["text", "json", "html"],
         thresholds: {
            global: {
               branches: 50,
               functions: 70,
               lines: 60,
               statements: 60,
            },
         },
      },
      environment: "node",
      globals: true,
      include: ["packages/pi-*/**/*.test.ts"],
      exclude: ["**/node_modules/**", "packages/pi-multi-auth/**"],
   },
});
