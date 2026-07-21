import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The CLI is a separate package with its own toolchain (tsconfig, build).
    // It manages its own quality; the root Next lint shouldn't touch it —
    // especially cli/dist, the generated esbuild bundle.
    "cli/**",
  ]),
]);

export default eslintConfig;
