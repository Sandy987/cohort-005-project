import { describe, it, expect } from "vitest";
import {
  checkRefundPolicy,
  type RefundPolicyFacts,
} from "./refund-policy.server";

// Local-time dates, matching how the Refund Window counts calendar days.
const purchasedAt = new Date(2026, 0, 10, 23, 0).toISOString();

function facts(overrides: Partial<RefundPolicyFacts> = {}): RefundPolicyFacts {
  return {
    purchase: { createdAt: purchasedAt, amountPaid: 7900 },
    hasRequestedRefund: false,
    hasClaimedSeat: false,
    lessonCount: 10,
    completedLessonCount: 0,
    secondsWatched: 0,
    ...overrides,
  };
}

const dayAfterPurchase = new Date(2026, 0, 11, 9, 0);

describe("checkRefundPolicy", () => {
  it("is eligible for a fresh Purchase", () => {
    const decision = checkRefundPolicy(facts(), dayAfterPurchase);
    expect(decision).toEqual({
      eligible: true,
      refundAmount: 7900,
      lastDayInWindow: "2026-01-24",
    });
  });

  describe("Refund Window", () => {
    it("is eligible on the day of purchase", () => {
      const decision = checkRefundPolicy(
        facts(),
        new Date(2026, 0, 10, 23, 30)
      );
      expect(decision.eligible).toBe(true);
    });

    it("is eligible late on the last day of the window", () => {
      const decision = checkRefundPolicy(
        facts(),
        new Date(2026, 0, 24, 23, 59)
      );
      expect(decision.eligible).toBe(true);
    });

    it("is not eligible the day after the window closes", () => {
      const decision = checkRefundPolicy(facts(), new Date(2026, 0, 25, 0, 1));
      expect(decision).toEqual({
        eligible: false,
        reason: "outside-refund-window",
      });
    });

    it("is not eligible before the day of purchase", () => {
      const decision = checkRefundPolicy(facts(), new Date(2026, 0, 9, 12, 0));
      expect(decision).toEqual({
        eligible: false,
        reason: "outside-refund-window",
      });
    });
  });

  describe("video watched", () => {
    it("is eligible just under 2 hours watched", () => {
      const decision = checkRefundPolicy(
        facts({ secondsWatched: 2 * 60 * 60 - 1 }),
        dayAfterPurchase
      );
      expect(decision.eligible).toBe(true);
    });

    it("is not eligible at 2 hours watched", () => {
      const decision = checkRefundPolicy(
        facts({ secondsWatched: 2 * 60 * 60 }),
        dayAfterPurchase
      );
      expect(decision).toEqual({ eligible: false, reason: "watched-too-much" });
    });
  });

  describe("lessons completed", () => {
    it("is eligible with under half the lessons completed", () => {
      const decision = checkRefundPolicy(
        facts({ lessonCount: 10, completedLessonCount: 4 }),
        dayAfterPurchase
      );
      expect(decision.eligible).toBe(true);
    });

    it("is not eligible with half the lessons completed", () => {
      const decision = checkRefundPolicy(
        facts({ lessonCount: 10, completedLessonCount: 5 }),
        dayAfterPurchase
      );
      expect(decision).toEqual({
        eligible: false,
        reason: "completed-too-much",
      });
    });

    it("is eligible for a Course with no lessons", () => {
      const decision = checkRefundPolicy(
        facts({ lessonCount: 0, completedLessonCount: 0 }),
        dayAfterPurchase
      );
      expect(decision.eligible).toBe(true);
    });
  });

  it("is not eligible once a Seat on the Purchase is claimed", () => {
    const decision = checkRefundPolicy(
      facts({ hasClaimedSeat: true }),
      dayAfterPurchase
    );
    expect(decision).toEqual({ eligible: false, reason: "seat-claimed" });
  });

  it("is not eligible while a Refund Request is Requested", () => {
    const decision = checkRefundPolicy(
      facts({ hasRequestedRefund: true }),
      dayAfterPurchase
    );
    expect(decision).toEqual({
      eligible: false,
      reason: "refund-already-requested",
    });
  });

  describe("Refund Amount", () => {
    it("is the amount paid, not a List Price that has since changed", () => {
      // Bought at $79; the List Price is irrelevant to the policy.
      const decision = checkRefundPolicy(
        facts({ purchase: { createdAt: purchasedAt, amountPaid: 7900 } }),
        dayAfterPurchase
      );
      expect(decision).toMatchObject({ refundAmount: 7900 });
    });

    it("is the PPP Price that was paid", () => {
      const decision = checkRefundPolicy(
        facts({ purchase: { createdAt: purchasedAt, amountPaid: 2370 } }),
        dayAfterPurchase
      );
      expect(decision).toMatchObject({ refundAmount: 2370 });
    });

    it("is the full amount for every Seat of a Team Purchase", () => {
      const decision = checkRefundPolicy(
        facts({ purchase: { createdAt: purchasedAt, amountPaid: 5 * 7900 } }),
        dayAfterPurchase
      );
      expect(decision).toMatchObject({ refundAmount: 39500 });
    });
  });
});
