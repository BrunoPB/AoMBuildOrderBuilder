/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  base: process.env.BASE_PATH ?? "./",
  plugins: [preact()],
  build: { target: "es2022", sourcemap: true },
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "node",
  },
});
