/**
 * Paystack browser callback controller.
 *
 * The callback URL configured in Paystack should point to this GET endpoint.
 * Never trust the query-string status: verify the reference with Paystack.
 *
 * This controller intentionally delegates persistence/state transitions to
 * your PaymentService/PaymentOrchestrator through reconcileVerifiedTransaction.
 */

const normalizeStatus = (status) =>
  String(status || "UNKNOWN").trim().toUpperCase();

const safeFrontendUrl = (base, path) => {
  const url = new URL(path, base);
  // Do not allow an arbitrary redirect target from request query parameters.
  return url;
};

export function createPaystackCallbackController({
  paystackGateway,
  getPaymentByProviderReference,
  reconcileVerifiedTransaction,
  frontendBaseUrl,
  successPath = "/payment/success",
  failedPath = "/payment/failed",
  pendingPath = "/payment/pending",
  errorPath = "/payment/error",
  logger = console,
}) {
  if (!paystackGateway || typeof paystackGateway.verifyTransaction !== "function") {
    throw new TypeError("A PaystackGateway with verifyTransaction() is required.");
  }
  if (typeof getPaymentByProviderReference !== "function") {
    throw new TypeError("getPaymentByProviderReference() dependency is required.");
  }
  if (typeof reconcileVerifiedTransaction !== "function") {
    throw new TypeError("reconcileVerifiedTransaction() dependency is required.");
  }
  if (!frontendBaseUrl) {
    throw new TypeError("frontendBaseUrl is required.");
  }

  return async function paystackCallback(req, res, next) {
    try {
      // Paystack commonly returns `reference` and may also include `trxref`.
      const reference = String(
        req.query?.reference || req.query?.trxref || "",
      ).trim();

      if (!reference || reference.length > 200) {
        return res.redirect(
          303,
          safeFrontendUrl(frontendBaseUrl, errorPath).toString(),
        );
      }

      // Do not accept a browser-supplied status as proof of payment.
      const transaction = await paystackGateway.verifyTransaction(reference);

      if (
        !transaction ||
        transaction.provider !== "PAYSTACK" ||
        transaction.providerReference !== reference
      ) {
        logger.warn?.("[PaystackCallback] Provider reference mismatch.", {
          reference,
        });
        return res.redirect(
          303,
          safeFrontendUrl(frontendBaseUrl, errorPath).toString(),
        );
      }

      // Look up our own payment record using the provider reference.
      // The adapter should query the Payment collection/service, not trust
      // customer/order identifiers supplied by the browser.
      const payment = await getPaymentByProviderReference(reference);

      if (!payment) {
        logger.warn?.("[PaystackCallback] No internal payment found.", {
          reference,
        });
        return res.redirect(
          303,
          safeFrontendUrl(frontendBaseUrl, errorPath).toString(),
        );
      }

      // These values must be the authoritative values persisted during
      // payment initialization, not values taken from the callback request.
      const expectedAmount = Number(payment.amount);
      const expectedCurrency = String(payment.currency || "").toUpperCase();

      if (
        !Number.isFinite(expectedAmount) ||
        expectedAmount <= 0 ||
        transaction.amount === null ||
        Number(transaction.amount) !== expectedAmount ||
        !expectedCurrency ||
        String(transaction.currency || "").toUpperCase() !== expectedCurrency
      ) {
        logger.error?.("[PaystackCallback] Verified transaction does not match payment.", {
          paymentId: payment._id?.toString?.() || payment.id,
          reference,
          expectedAmount,
          actualAmount: transaction.amount,
          expectedCurrency,
          actualCurrency: transaction.currency,
        });

        // Pass the mismatch to reconciliation only if your service supports
        // recording a security/reconciliation exception. Do not mark paid.
        return res.redirect(
          303,
          safeFrontendUrl(frontendBaseUrl, errorPath).toString(),
        );
      }

      const status = normalizeStatus(transaction.status);

      // This adapter must be idempotent. It should update the existing internal
      // payment through your PaymentEngine/PaymentOrchestrator, and must not
      // create a second Payment record. The Paystack webhook remains the
      // asynchronous source of truth and must use the same idempotent rules.
      await reconcileVerifiedTransaction({
        payment,
        transaction,
        source: "PAYSTACK_CALLBACK",
      });

      const destination =
        status === "SUCCESS"
          ? successPath
          : status === "FAILED"
            ? failedPath
            : pendingPath;

      const redirectUrl = safeFrontendUrl(frontendBaseUrl, destination);

      // Only expose a non-secret internal reference for frontend correlation.
      const internalReference =
        payment.paymentReference || payment.reference || payment._id?.toString?.();

      if (internalReference) {
        redirectUrl.searchParams.set("reference", String(internalReference));
      }

      return res.redirect(303, redirectUrl.toString());
    } catch (error) {
      logger.error?.("[PaystackCallback] Callback processing failed.", {
        message: error?.message,
        code: error?.code,
      });

      if (typeof next === "function" && error?.status === 404) {
        return next(error);
      }

      return res.redirect(
        303,
        safeFrontendUrl(frontendBaseUrl, errorPath).toString(),
      );
    }
  };
}
