import { eq } from "drizzle-orm";
import { courses, refunds, users, RefundStatus } from "~/db/schema";
import { formatPrice } from "~/lib/utils";
import {
  sendSafely,
  toNotificationPerson,
  type Notifications,
} from "~/lib/notifications.server";
import { getPurchase, getSeats, kindOf } from "./purchases";
import type { Db, Email, Purchase, Queryable } from "./types";

/** The email the buyer gets once their Refund Request is decided. */
export function buildDecisionEmail(
  db: Queryable,
  purchase: Purchase,
  decision: RefundStatus.Approved | RefundStatus.Declined,
  note: string | null
): Email {
  const buyer = db
    .select()
    .from(users)
    .where(eq(users.id, purchase.userId))
    .get();
  const course = db
    .select()
    .from(courses)
    .where(eq(courses.id, purchase.courseId))
    .get();

  const courseTitle = course?.title ?? "your course";
  const noteLines = note ? ["", note] : [];

  const middle =
    decision === RefundStatus.Approved
      ? [
          `We have approved your refund request for "${courseTitle}".`,
          `${formatPrice(purchase.amountPaid)}, the full amount you paid, is on its way back to you.`,
          ...noteLines,
        ]
      : [
          `We have looked at your refund request for "${courseTitle}" and decided not to refund it.`,
          ...noteLines,
          "",
          "You still have everything you bought. If something changes, you can raise a new refund request.",
        ];

  return {
    to: buyer?.email ?? "",
    subject: `Refund ${decision} — ${courseTitle}`,
    body: [
      `Hi ${buyer?.name ?? "there"},`,
      "",
      ...middle,
      "",
      "— The Cadence team",
    ].join("\n"),
  };
}

// ─── Notifications ───

/**
 * Tells the buyer how their Refund Request was decided. Reads the decision
 * back after it has committed.
 */
export async function notifyDecision(
  db: Db,
  refundRequestId: number,
  notifications: Notifications
) {
  const refundRequest = db
    .select()
    .from(refunds)
    .where(eq(refunds.id, refundRequestId))
    .get();
  if (!refundRequest || refundRequest.status === RefundStatus.Open) return;

  const purchase = getPurchase(db, refundRequest.purchaseId);
  if (!purchase) return;
  const buyer = db
    .select()
    .from(users)
    .where(eq(users.id, purchase.userId))
    .get();
  const course = db
    .select()
    .from(courses)
    .where(eq(courses.id, purchase.courseId))
    .get();
  const decider = refundRequest.resolvedByUserId
    ? db
        .select()
        .from(users)
        .where(eq(users.id, refundRequest.resolvedByUserId))
        .get()
    : undefined;
  if (!buyer || !course) return;

  const purchaseKind = kindOf(getSeats(db, purchase.id));
  const data = {
    refundRequestId,
    courseTitle: course.title,
    purchaseKind,
    amount: formatPrice(purchase.amountPaid),
    url: purchaseKind === "team_licence" ? "/team" : "/settings",
  };
  const recipient = toNotificationPerson(buyer);
  const actor = decider ? toNotificationPerson(decider) : undefined;

  if (refundRequest.status === RefundStatus.Approved) {
    await sendSafely(
      notifications,
      {
        kind: "refund-approved",
        recipient,
        actor,
        data: { ...data, decisionNote: refundRequest.decisionNote },
      },
      `refund-approved:${refundRequestId}`
    );
  } else {
    await sendSafely(
      notifications,
      {
        kind: "refund-declined",
        recipient,
        actor,
        data: { ...data, decisionNote: refundRequest.decisionNote ?? "" },
      },
      `refund-declined:${refundRequestId}`
    );
  }
}
