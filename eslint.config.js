import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

// app/lib holds one directory per domain (notifications/, refunds/, ...).
// A file directly under app/lib has skipped that choice.
const libInDomainDir = {
  meta: {
    type: "suggestion",
    messages: {
      flat: "Put this module in a domain directory under app/lib (e.g. app/lib/notifications/), not app/lib itself.",
    },
    schema: [],
  },
  create(context) {
    return {
      Program(node) {
        const rel = context.filename.slice(context.cwd.length + 1);
        if (/^app\/lib\/[^/]+$/.test(rel)) {
          context.report({ node, messageId: "flat" });
        }
      },
    };
  },
};

// Violations that predate this config live in eslint-suppressions.json.
// Fix one, then run `npm run lint -- --prune-suppressions`.
export default tseslint.config(
  {
    ignores: [
      "build/**",
      ".react-router/**",
      ".claude/worktrees/**",
      "_internal/**",
      ".sandcastle/**",
      "app/components/ui/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.base],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: {
      "react-hooks": reactHooks,
      layout: { rules: { "lib-in-domain-dir": libInDomainDir } },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
      ],
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        { considerDefaultExhaustiveForUnions: false, requireDefaultForNonUnion: false },
      ],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "layout/lib-in-domain-dir": "error",
    },
  },
);
