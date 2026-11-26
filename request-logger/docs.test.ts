import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function relativeLinks(markdown: string): string[] {
  return [...markdown.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)]
    .map((match) => match[1])
    .filter((target) => !/^[a-z]+:/i.test(target));
}

// The README was split across files; a link that points at a moved or
// renamed file fails silently in a Markdown viewer, so it fails here instead.
describe("request-logger docs", () => {
  it.each(["README.md", "docs/agents.md"])(
    "%s links only to files that exist",
    (file) => {
      const path = join(here, file);
      const links = relativeLinks(readFileSync(path, "utf8"));
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        expect(existsSync(join(dirname(path), link))).toBe(true);
      }
    }
  );

  it("the README points to the per-agent notes", () => {
    const readme = readFileSync(join(here, "README.md"), "utf8");
    expect(relativeLinks(readme)).toContain("docs/agents.md");
  });
});
