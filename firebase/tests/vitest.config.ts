import { defineConfig } from "vitest/config";

// Tests exécutés contre les émulateurs Firebase (lancés par `npm run test:rules`).
export default defineConfig({
  test: {
    include: ["firebase/tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
