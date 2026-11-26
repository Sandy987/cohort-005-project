// Fails when a file is too big for an agent to read and edit in one go.
// Tokens are estimated as bytes / 4, which is close enough for code.
// Usage: node scripts/check-file-tokens.js <file>...
//        node scripts/check-file-tokens.js --all   (every tracked file)

import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const MAX_TOKENS = 5000;
const BYTES_PER_TOKEN = 4;

// Generated files that nobody edits by hand, and workflow files, which
// GitHub reads as one file each and which cannot be split.
const IGNORED = [
  /(^|\/)package-lock\.json$/,
  /^drizzle\//,
  /^\.github\/workflows\/[^/]+\.yml$/,
];

// Files that were already over the limit when this check started covering
// every file. Each may stay over, at or under its size here, so a ticket that
// touches one does not turn into splitting it. Splitting one is its own
// ticket: when you do, delete its entry. The list only ever shrinks.
const GRANDFATHERED = {
  "scripts/seed.ts": 23214,
  "app/routes/instructor.$courseId.tsx": 17799,
  "app/routes/courses.$slug.lessons.$lessonId.tsx": 14201,
  "request-logger/agents.ts": 13685,
  "request-logger/agents.test.ts": 13654,
  "app/routes/instructor.analytics.tsx": 9832,
  "app/modules/instructor-analytics/tests/instructor-analytics.test.ts": 9309,
  "app/routes/courses.$slug.tsx": 8807,
  "app/routes/instructor.$courseId.lessons.$lessonId.quiz.tsx": 8767,
  "app/modules/instructor-analytics/lib/instructor-analytics.ts": 8032,
  "request-logger/render.ts": 7464,
  "app/lib/refunds.server.ts": 6390,
  "app/lib/refunds.server.test.ts": 6267,
  "request-logger/proxy.ts": 5404,
  "request-logger/README.md": 5104,
};

const isBinary = (contents) => contents.subarray(0, 8000).includes(0);

const args = process.argv.slice(2);
const files = args.includes("--all")
  ? execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
      .split("\0")
      .filter(
        (file) => file && statSync(file, { throwIfNoEntry: false })?.isFile()
      )
  : args;

const sized = files
  .map((file) => file.replaceAll("\\", "/").replace(`${process.cwd()}/`, ""))
  .filter((file) => !IGNORED.some((pattern) => pattern.test(file)))
  .map((file) => ({ file, contents: readFileSync(file) }))
  .filter(({ contents }) => !isBinary(contents))
  .map(({ file, contents }) => ({
    file,
    tokens: Math.ceil(contents.length / BYTES_PER_TOKEN),
    allowed: GRANDFATHERED[file],
  }));

const grew = sized.filter(
  ({ tokens, allowed }) => allowed !== undefined && tokens > allowed
);
const nowUnderLimit = sized.filter(
  ({ tokens, allowed }) => allowed !== undefined && tokens <= MAX_TOKENS
);
const oversized = sized.filter(
  ({ tokens, allowed }) => allowed === undefined && tokens > MAX_TOKENS
);

if (grew.length > 0) {
  console.error(`These files were already too big, and they grew:\n`);
  for (const { file, tokens, allowed } of grew) {
    console.error(`  ${file}: ~${tokens} tokens (allowed: ${allowed})`);
  }
  console.error(`
Bring each back to its allowed size: put the new code in a new file and
import it. Splitting the whole file is a separate ticket.
`);
}

if (nowUnderLimit.length > 0) {
  console.error(`These files are now under ${MAX_TOKENS} tokens:\n`);
  for (const { file } of nowUnderLimit) console.error(`  ${file}`);
  console.error(`
Delete their entries from GRANDFATHERED in scripts/check-file-tokens.js.
`);
}

if (oversized.length > 0) {
  console.error(`These files are over ${MAX_TOKENS} tokens (bytes / 4):\n`);
  for (const { file, tokens } of oversized) {
    console.error(`  ${file}: ~${tokens} tokens`);
  }
  console.error(`
Split each file before you commit. Do not delete code or squash it onto fewer
lines to get under the limit.

How to split:
- Find the seams. Look for groups of functions, components, or tests that
  change together and share little with the rest of the file.
- Route modules (app/routes/*): keep the loader, action, and page component in
  the route file. Move the business logic into a module in app/modules/ and
  sub-components into their own files in app/components/.
- Logic that is already in a module (app/modules/<name>/): split it into more
  files under lib/. Keep the entry points (index.ts, index.server.ts) small. Do
  not add a barrel file. See app/modules/README.md.
- Tests: split by the behaviour under test, one file per area (for example
  <name>.refunds.test.ts, <name>.permissions.test.ts). Move shared fixtures
  into a fixtures file in the same tests/ folder.
- Scripts and seed data: move large data literals into their own files and
  import them.

When you are done, run \`npm run check\` and commit again.`);
}

if (grew.length + nowUnderLimit.length + oversized.length > 0) process.exit(1);
