import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: ["planner/**/*.ts", "sample-bot/**/*.ts", "judge/**/*.ts", "worker/**/*.ts", "web/**/*.ts", "report/**/*.ts"],
      thresholds: { lines: 75, functions: 75, branches: 70, statements: 75 },
    },
  },
});
