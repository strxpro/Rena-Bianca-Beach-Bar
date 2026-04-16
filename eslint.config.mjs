import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

/* ── Flat-config adapter for ESLint v9 ───────────────────────────
   Next.js ships a classic `.eslintrc`-style preset (`next/core-web-vitals`)
   that isn't flat-config natively. `FlatCompat` bridges it so we
   keep the React / hooks / a11y / image rules Next gives us
   without having to hand-write every rule. */
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      /* Allow intentionally-unused args / destructures that start
         with an underscore (e.g. `{ side: _side }`) — this is the
         conventional way to signal "kept for API compatibility,
         not read inside the function" without littering the code
         with eslint-disable comments. */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "tsconfig.tsbuildinfo",
    ],
  },
];

export default eslintConfig;
