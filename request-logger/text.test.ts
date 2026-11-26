import { describe, it, expect } from "vitest";
import { styleText } from "node:util";
import { bold, dim, wrap } from "./text";

describe("dim and bold", () => {
  it("style the text they are given", () => {
    expect(dim("quiet")).toBe(styleText("dim", "quiet"));
    expect(bold("loud")).toBe(styleText("bold", "loud"));
  });
});

describe("wrap", () => {
  it("keeps a short paragraph on one line", () => {
    expect(wrap("one two three", 20)).toEqual(["one two three"]);
  });

  it("breaks before the word that would pass the width", () => {
    expect(wrap("aaaa bbbb cccc", 9)).toEqual(["aaaa bbbb", "cccc"]);
  });

  it("breaks when a line would reach exactly one past the width", () => {
    expect(wrap("aaaa bbbbb", 9)).toEqual(["aaaa", "bbbbb"]);
  });

  it("treats any run of whitespace as one gap", () => {
    expect(wrap("one \n  two", 20)).toEqual(["one two"]);
  });

  it("returns no lines for empty text", () => {
    expect(wrap("", 20)).toEqual([]);
  });
});
