import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "~/db";
import {
  seats,
  lessonProgress,
  lessons,
  LessonProgressStatus,
  modules,
  purchases,
  refunds,
  RefundStatus,
  videoWatchEvents,
} from "~/db/schema";

const REFUND_WINDOW_DAYS = 14;
const MAX_SECONDS_WATCHED = 2 * 60 * 60;
const MAX_COMPLETED_LESSON_SHARE = 0.5;

export type RefundPolicyFacts = {
  purchase: { createdAt: string; amountPaid: number };
  hasRequestedRefund: boolean;
  hasClaimedSeat: boolean;
  lessonCount: number;
  completedLessonCount: number;
  secondsWatched: number;
};

export type RefundIneligibleReason =
  | "refund-already-requested"
  | "seat-claimed"
  | "outside-refund-window"
  | "watched-too-much"
  | "completed-too-much";

export type RefundPolicyDecision =
  | { eligible: true; refundAmount: number; lastDayInWindow: string }
  | { eligible: false; reason: RefundIneligibleReason };

// The Refund Window is counted in whole calendar days, not hours — someone who
// buys at 23:00 still gets the whole of their fourteenth day.
function calendarDay(when: Date): string {
  const month = String(when.getMonth() + 1).padStart(2, "0");
  const day = String(when.getDate()).padStart(2, "0");
  return `${when.getFullYear()}-${month}-${day}`;
}

/**
 * The Refund Policy: decides whether a Purchase is eligible for a Refund and,
 * if so, the Refund Amount. Rules are checked in a fixed order so the first
 * failing rule is the reason given.
 */
export function checkRefundPolicy(
  facts: RefundPolicyFacts,
  now: Date
): RefundPolicyDecision {
  if (facts.hasRequestedRefund) {
    return { eligible: false, reason: "refund-already-requested" };
  }

  if (facts.hasClaimedSeat) {
    return { eligible: false, reason: "seat-claimed" };
  }

  const purchasedAt = new Date(facts.purchase.createdAt);
  const purchaseDay = calendarDay(purchasedAt);
  const windowEnd = new Date(purchasedAt);
  windowEnd.setDate(windowEnd.getDate() + REFUND_WINDOW_DAYS);
  const lastDayInWindow = calendarDay(windowEnd);
  const today = calendarDay(now);

  if (today < purchaseDay || today > lastDayInWindow) {
    return { eligible: false, reason: "outside-refund-window" };
  }

  if (facts.secondsWatched >= MAX_SECONDS_WATCHED) {
    return { eligible: false, reason: "watched-too-much" };
  }

  if (
    facts.lessonCount > 0 &&
    facts.completedLessonCount / facts.lessonCount >= MAX_COMPLETED_LESSON_SHARE
  ) {
    return { eligible: false, reason: "completed-too-much" };
  }

  // The Refund Amount is always what was paid: the PPP Price if there was
  // one, and the total for every Seat of a Team Purchase.
  return {
    eligible: true,
    refundAmount: facts.purchase.amountPaid,
    lastDayInWindow,
  };
}

function getLatestPurchase(userId: number, courseId: number) {
  return db
    .select()
    .from(purchases)
    .where(and(eq(purchases.userId, userId), eq(purchases.courseId, courseId)))
    .orderBy(sql`${purchases.createdAt} desc`)
    .get();
}

function getLessonIdsForCourse(courseId: number): number[] {
  return db
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(eq(modules.courseId, courseId))
    .all()
    .map((row) => row.id);
}

function hasRequestedRefund(purchaseId: number) {
  const row = db
    .select({ id: refunds.id })
    .from(refunds)
    .where(
      and(
        eq(refunds.purchaseId, purchaseId),
        eq(refunds.status, RefundStatus.Requested)
      )
    )
    .get();
  return row !== undefined;
}

function hasClaimedSeat(purchaseId: number) {
  const row = db
    .select({ id: seats.id })
    .from(seats)
    .where(
      and(eq(seats.purchaseId, purchaseId), isNotNull(seats.claimedAt))
    )
    .get();
  return row !== undefined;
}

function getCompletedLessonCount(userId: number, lessonIds: number[]) {
  if (lessonIds.length === 0) return 0;

  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.status, LessonProgressStatus.Completed),
        inArray(lessonProgress.lessonId, lessonIds)
      )
    )
    .get();

  return result?.count ?? 0;
}

function getSecondsWatched(userId: number, lessonIds: number[]) {
  if (lessonIds.length === 0) return 0;

  const furthestPerLesson = db
    .select({
      furthest: sql<number>`max(${videoWatchEvents.positionSeconds})`,
    })
    .from(videoWatchEvents)
    .where(
      and(
        eq(videoWatchEvents.userId, userId),
        inArray(videoWatchEvents.lessonId, lessonIds)
      )
    )
    .groupBy(videoWatchEvents.lessonId)
    .all();

  return furthestPerLesson.reduce((total, row) => total + row.furthest, 0);
}

/**
 * Applies the Refund Policy to a Student's latest Purchase of a Course.
 * Returns null if they have no Purchase of it.
 */
export function getRefundPolicyDecision(
  userId: number,
  courseId: number,
  now: Date = new Date()
) {
  const purchase = getLatestPurchase(userId, courseId);
  if (!purchase) return null;

  const lessonIds = getLessonIdsForCourse(courseId);

  const decision = checkRefundPolicy(
    {
      purchase,
      hasRequestedRefund: hasRequestedRefund(purchase.id),
      hasClaimedSeat: hasClaimedSeat(purchase.id),
      lessonCount: lessonIds.length,
      completedLessonCount: getCompletedLessonCount(userId, lessonIds),
      secondsWatched: getSecondsWatched(userId, lessonIds),
    },
    now
  );

  return { purchase, decision };
}
