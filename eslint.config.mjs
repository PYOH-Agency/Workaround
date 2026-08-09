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
    // La pile Supabase d'un worktree : la CLI y depose des fichiers temporaires
    // — du JavaScript minifie du runtime edge — que rien n'oblige a nos regles.
    ".supabase-local/**",
  ]),
]);

export default eslintConfig;
