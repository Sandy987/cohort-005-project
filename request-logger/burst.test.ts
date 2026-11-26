import { describe, it, expect } from "vitest";
import { BURST_WINDOW_MS, burstKey, trackBurst } from "./burst";

describe("trackBurst window edges", () => {
  const KEY = burstKey("POST", "/v1/messages", 400);
  const START = 1_000_000;

  it("still counts a repeat that lands exactly on the end of the window", () => {
    const first = trackBurst(null, KEY, START);
    const onEdge = trackBurst(first.state, KEY, START + BURST_WINDOW_MS);
    expect(onEdge.state.count).toBe(2);
    expect(onEdge.state.windowStart).toBe(START);
  });

  it("measures the window from its start, not from time zero", () => {
    const first = trackBurst(null, KEY, START);
    const soon = trackBurst(first.state, KEY, START + 1);
    expect(soon.state.count).toBe(2);
  });
});
