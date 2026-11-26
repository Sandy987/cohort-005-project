// docs/adr/0001–0004 explain why Refunds work the way they do.

export type { Db, Email, Failure } from "./lib/types";
export { calendarDay, lastDayOfWindow } from "./lib/calendar";
export {
  getNewestIndividualPurchase,
  getSeatAvailability,
  type PurchaseKind,
  type SeatAvailability,
} from "./lib/purchases";
export type { RefundFigures } from "./lib/rules";
export {
  checkRefundRequest,
  getRefundOffer,
  raiseRefundRequest,
  type RaiseResult,
  type RefundOffer,
} from "./lib/raise";
export {
  listRefundRequestsForBuyer,
  listRefundRequestsForReview,
  listTeamLicences,
  type RefundRequestForReview,
} from "./lib/listings";
export {
  approveRefundRequest,
  declineRefundRequest,
  type DecisionResult,
} from "./lib/decisions";
