import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { daysAgo, hoursAgo, makeRandom, slugify } from "./helpers";

describe("makeRandom", () => {
  // The generated history is a fixture later work asserts against. These are
  // the first draws from the seed the seed script uses; if they change, every
  // generated purchase, enrolment and progress row changes with them.
  it("produces the same sequence for the seed the seed script uses", () => {
    const random = makeRandom(20260731);

    expect([random(), random(), random()]).toEqual([
      0.011200215434655547, 0.39930348889902234, 0.4112097383476794,
    ]);
  });

  it("produces the same sequence on every run for a given seed", () => {
    const first = makeRandom(42);
    const second = makeRandom(42);

    const firstDraws = Array.from({ length: 50 }, () => first());
    const secondDraws = Array.from({ length: 50 }, () => second());

    expect(secondDraws).toEqual(firstDraws);
  });

  it("produces different sequences for different seeds", () => {
    expect(makeRandom(1)()).not.toEqual(makeRandom(2)());
  });

  it("draws numbers in [0, 1)", () => {
    const random = makeRandom(20260731);

    for (let i = 0; i < 1000; i++) {
      const draw = random();
      expect(draw).toBeGreaterThanOrEqual(0);
      expect(draw).toBeLessThan(1);
    }
  });
});

describe("slugify", () => {
  it("lowercases and joins words with hyphens", () => {
    expect(slugify("Marta Novak")).toBe("marta-novak");
  });

  it("collapses runs of other characters into one hyphen", () => {
    expect(slugify("Node.js & Express: APIs")).toBe("node-js-express-apis");
  });

  it("trims hyphens from both ends", () => {
    expect(slugify("  Hello, World!  ")).toBe("hello-world");
  });
});

describe("daysAgo and hoursAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-26T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts days back from now", () => {
    expect(daysAgo(0)).toBe("2026-11-26T12:00:00.000Z");
    expect(daysAgo(10)).toBe("2026-11-16T12:00:00.000Z");
  });

  it("counts hours back from now", () => {
    expect(hoursAgo(0)).toBe("2026-11-26T12:00:00.000Z");
    expect(hoursAgo(36)).toBe("2026-11-25T00:00:00.000Z");
  });
});
