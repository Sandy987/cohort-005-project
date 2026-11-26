import { describe, it, expect } from "vitest";
import { calendarDay, lastDayOfWindow } from "../refunds.server";

describe("the calendar days of the refund window", () => {
  it("names a day with a zero-padded month and day", () => {
    expect(calendarDay(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
    expect(calendarDay(new Date(2026, 10, 26, 0, 0))).toBe("2026-11-26");
  });

  it("ends the window on the fourteenth day after the purchase", () => {
    const purchasedAt = new Date(2026, 9, 6, 23, 0).toISOString();
    expect(lastDayOfWindow(purchasedAt)).toBe("2026-10-20");
  });

  it("carries the window across a month and a year end", () => {
    const purchasedAt = new Date(2026, 11, 25, 9, 0).toISOString();
    expect(lastDayOfWindow(purchasedAt)).toBe("2027-01-08");
  });
});
