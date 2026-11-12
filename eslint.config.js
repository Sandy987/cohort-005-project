import fs from "node:fs";
import path from "node:path";
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
// app/routes groups route modules by their first URL segment: every
// courses.* file lives in app/routes/courses/. A lone segment (settings.tsx)
// stays at the top level until a second file shares its segment.
const routesGroupedBySegment = {
  meta: {
    type: "suggestion",
    messages: {
      group:
        "Move this route into app/routes/{{segment}}/: another route shares the '{{segment}}' segment.",
    },
    schema: [],
  },
  create(context) {
    return {
      Program(node) {
        const rel = context.filename.slice(context.cwd.length + 1);
        const match = /^app\/routes\/([^/]+)$/.exec(rel);
        if (!match) return;
        const segment = match[1].split(".")[0];
        const dir = path.join(context.cwd, "app/routes");
        const shared = fs
          .readdirSync(dir, { withFileTypes: true })
          .some((entry) =>
            entry.isDirectory()
              ? entry.name === segment
              : entry.name !== match[1] && entry.name.split(".")[0] === segment,
          );
        if (shared) context.report({ node, messageId: "group", data: { segment } });
      },
    };
  },
};

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
      layout: {
        rules: {
          "lib-in-domain-dir": libInDomainDir,
          "routes-grouped-by-segment": routesGroupedBySegment,
        },
      },
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
      "layout/routes-grouped-by-segment": "error",
    },
  },
);
