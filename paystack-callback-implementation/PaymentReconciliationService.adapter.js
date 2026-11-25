/**
 * Adapter contract for your existing PaymentEngine/PaymentOrchestrator.
 *
 * Replace the body with the actual method exposed by your financial layer.
 * The uploaded files do not include Payment schema, PaymentEngine, or
 * PaymentOrchestrator APIs, so inventing a method name here would be unsafe.
 *
 * Requirements:
 * 1. Locate the already-created Payment using payment._id/paymentReference.
 * 2. Confirm its current state allows this transition.
 * 3. Apply the provider's verified status and transaction metadata.
 * 4. Be idempotent (callback and webhook can report the same transaction).
 * 5. Never mark a payment successful unless the verified transaction status
 *    is SUCCESS and amount/currency/reference have been validated.
 * 6. Do not issue tickets/fulfil orders twice; use your existing idempotency
 *    and outbox/event mechanisms.
 */
export async function reconcileVerifiedPaystackPayment({
  payment,
  transaction,
  source,
}) {
  // EXAMPLE INTEGRATION POINT:
  //
  // return paymentOrchestrator.reconcileProviderVerification({
  //   paymentId: payment._id,
  //   provider: "PAYSTACK",
  //   providerReference: transaction.providerReference,
  //   providerTransactionId: transaction.transactionId,
  //   status: transaction.status,
  //   amount: transaction.amount,
  //   currency: transaction.currency,
  //   paidAt: transaction.paidAt,
  //   source,
  // });
  //
  // Replace the example with the real public method in your project.
  throw new Error(
    "Wire reconcileVerifiedPaystackPayment() to your existing PaymentEngine/PaymentOrchestrator.",
  );
}
