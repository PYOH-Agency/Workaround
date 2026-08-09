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
    // Les piles Supabase locales : la CLI y depose des fichiers temporaires —
    // du JavaScript minifie du runtime edge — que rien n'oblige a nos regles.
    // `.gitignore` les excluait deja ; ESLint, lui, les lisait encore.
    ".supabase-local/**",
    "supabase/.temp/**",
    // Les worktrees imbriques sont d'autres checkouts, avec leur propre `.next`
    // et leur propre lint. Les analyser depuis le principal faisait remonter des
    // centaines d'erreurs sur du JavaScript compile qui n'appartient a personne.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
