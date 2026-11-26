import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { coupons, enrollments, refunds, RefundStatus } from "~/db/schema";
import type { Notifications } from "~/lib/notifications.server";
import { buildDecisionEmail, notifyDecision } from "./decision-messages";
import { getPurchase, getSeats, isClaimed, kindOf } from "./purchases";
import type { Db, Email, Failure, Purchase, Queryable } from "./types";

export type DecisionResult = { ok: true; email: Email } | Failure;

function findOpenRefundRequest(
  tx: Queryable,
  refundRequestId: number
): { ok: true; purchase: Purchase } | Failure {
  const refundRequest = tx
    .select()
    .from(refunds)
    .where(eq(refunds.id, refundRequestId))
    .get();

  if (!refundRequest) {
    return { ok: false, status: 404, error: "Refund request not found." };
  }

  // The first decision wins. A second Platform Admin deciding the same
  // request lands here and is told what already happened.
  if (refundRequest.status !== RefundStatus.Open) {
    return {
      ok: false,
      status: 409,
      error: `This refund request was already ${refundRequest.status}.`,
    };
  }

  const purchase = getPurchase(tx, refundRequest.purchaseId);
  if (!purchase) {
    return { ok: false, status: 404, error: "Purchase not found." };
  }

  return { ok: true, purchase };
}

/**
 * Approves an Open Refund Request and ends what its Purchase granted.
 *
 * - An Individual Purchase: the buyer loses their Enrollment, unless
 *   they also hold a Claimed Seat for the course (docs/adr/0004). Their progress stays
 *   (docs/adr/0001).
 * - A Team Licence: its Unclaimed Seats can never be claimed. Refused if any
 *   Seat has been claimed (docs/adr/0003).
 */
export async function approveRefundRequest(
  db: Db,
  refundRequestId: number,
  platformAdminId: number,
  note: string | null,
  now: Date,
  notifications: Notifications
): Promise<DecisionResult> {
  const result = db.transaction((tx): DecisionResult => {
    const found = findOpenRefundRequest(tx, refundRequestId);
    if (!found.ok) return found;

    const { purchase } = found;
    const seats = getSeats(tx, purchase.id);

    if (kindOf(seats) === "team_licence") {
      if (seats.some(isClaimed)) {
        return {
          ok: false,
          status: 409,
          error:
            "A Seat on this Team Licence has been claimed, so this refund request can only be declined.",
        };
      }

      tx.update(coupons)
        .set({ refundedAt: now.toISOString() })
        .where(
          and(eq(coupons.purchaseId, purchase.id), isNull(coupons.redeemedAt))
        )
        .run();
    } else {
      const claimedSeat = tx
        .select({ id: coupons.id })
        .from(coupons)
        .where(
          and(
            eq(coupons.redeemedByUserId, purchase.userId),
            eq(coupons.courseId, purchase.courseId),
            isNotNull(coupons.redeemedAt)
          )
        )
        .get();

      if (!claimedSeat) {
        tx.delete(enrollments)
          .where(
            and(
              eq(enrollments.userId, purchase.userId),
              eq(enrollments.courseId, purchase.courseId)
            )
          )
          .run();
      }
    }

    tx.update(refunds)
      .set({
        status: RefundStatus.Approved,
        amountRefunded: purchase.amountPaid,
        decisionNote: note,
        resolvedAt: now.toISOString(),
        resolvedByUserId: platformAdminId,
      })
      .where(eq(refunds.id, refundRequestId))
      .run();

    return {
      ok: true,
      email: buildDecisionEmail(tx, purchase, RefundStatus.Approved, note),
    };
  });

  if (result.ok) await notifyDecision(db, refundRequestId, notifications);
  return result;
}

/**
 * Declines an Open Refund Request. Nothing the Purchase granted is lost, and
 * the buyer may raise a new Refund Request. The note is required: it is how
 * the buyer learns whether another request is worth raising.
 */
export async function declineRefundRequest(
  db: Db,
  refundRequestId: number,
  platformAdminId: number,
  note: string,
  now: Date,
  notifications: Notifications
): Promise<DecisionResult> {
  const trimmedNote = note.trim();

  if (trimmedNote.length === 0) {
    return {
      ok: false,
      status: 400,
      error: "Write the buyer a note saying why it was declined.",
    };
  }

  const result = db.transaction((tx): DecisionResult => {
    const found = findOpenRefundRequest(tx, refundRequestId);
    if (!found.ok) return found;

    tx.update(refunds)
      .set({
        status: RefundStatus.Declined,
        decisionNote: trimmedNote,
        resolvedAt: now.toISOString(),
        resolvedByUserId: platformAdminId,
      })
      .where(eq(refunds.id, refundRequestId))
      .run();

    return {
      ok: true,
      email: buildDecisionEmail(
        tx,
        found.purchase,
        RefundStatus.Declined,
        trimmedNote
      ),
    };
  });

  if (result.ok) await notifyDecision(db, refundRequestId, notifications);
  return result;
}
