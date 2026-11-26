/**
 * Example Express route wiring.
 *
 * Adjust import paths to match your PaymentService project.
 */
import express from "express";
import PaystackGateway from "../Gateways/PaystackGateway.js";
import { createPaystackCallbackController } from "../Controllers/PaystackCallback.controller.js";
import Payment from "../Models/Payment.js";
import { reconcileVerifiedPaystackPayment } from "../Services/PaymentReconciliationService.js";

const router = express.Router();

// Reuse the same configured gateway instance used by your ProviderEngine.
const paystackGateway = new PaystackGateway();

const paystackCallback = createPaystackCallbackController({
  paystackGateway,

  // IMPORTANT: confirm this field name against your Payment schema.
  // This example assumes providerReference is persisted on Payment.
  getPaymentByProviderReference: (providerReference) =>
    Payment.findOne({
      provider: "PAYSTACK",
      providerReference,
    }),

  // Implement this adapter by calling your existing PaymentEngine /
  // PaymentOrchestrator state-transition method. Do not create a new payment.
  reconcileVerifiedTransaction: reconcileVerifiedPaystackPayment,

  frontendBaseUrl: process.env.FRONTEND_BASE_URL,
  successPath: "/payment/success",
  failedPath: "/payment/failed",
  pendingPath: "/payment/pending",
  errorPath: "/payment/error",
});

hi

router.get("/redirect/paystack", paystackCallback);

export default router;
