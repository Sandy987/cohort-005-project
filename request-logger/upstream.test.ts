import { describe, it, expect } from "vitest";
import type { CustomTarget } from "./agents";
import { forwardHeaders, upstreamPathPrefix } from "./upstream";

function customTarget(upstreamBaseUrl: string): CustomTarget {
  return {
    kind: "custom-target",
    agent: "opencode",
    agentLabel: "OpenCode",
    providerLabel: "Custom base URL",
    upstreamBaseUrl,
    renderer: "openai",
    baseUrl: "http://localhost:8787",
    command: "opencode",
    setup: [],
    notes: [],
    warnings: [],
  };
}

describe("upstreamPathPrefix on a hand-built CustomTarget", () => {
  it("strips every trailing slash, not just one", () => {
    expect(
      upstreamPathPrefix(customTarget("https://opencode.ai/zen/go//"))
    ).toBe("/zen/go");
  });

  it("is empty for a bare origin", () => {
    expect(upstreamPathPrefix(customTarget("http://localhost:11434/"))).toBe(
      ""
    );
  });
});

describe("forwardHeaders", () => {
  const incoming = {
    host: "localhost:8787",
    connection: "keep-alive",
    "accept-encoding": "gzip",
    "transfer-encoding": "chunked",
    "content-length": "999",
    "content-encoding": "zstd",
    authorization: "Bearer secret",
  };

  it("strips hop-by-hop headers and asks for an uncompressed response", () => {
    const out = forwardHeaders(incoming, Buffer.alloc(0));
    expect(out).not.toHaveProperty("host");
    expect(out).not.toHaveProperty("connection");
    expect(out).not.toHaveProperty("accept-encoding");
    expect(out).not.toHaveProperty("transfer-encoding");
  });

  it("keeps the auth header and the request's content-encoding", () => {
    const out = forwardHeaders(incoming, Buffer.alloc(0));
    expect(out.authorization).toBe("Bearer secret");
    expect(out["content-encoding"]).toBe("zstd");
  });

  it("recomputes content-length against the buffered body", () => {
    const out = forwardHeaders(incoming, Buffer.from("hello"));
    expect(out["content-length"]).toBe("5");
  });

  it("drops content-length when there is no body", () => {
    const out = forwardHeaders(incoming, Buffer.alloc(0));
    expect(out).not.toHaveProperty("content-length");
  });
});
