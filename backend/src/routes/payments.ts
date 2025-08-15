import express from "express";
import type { Request, Response } from "express";
import Invoice from "../models/Invoice.ts";
import { stripe } from "../config/stripe.ts";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;
router.post("/webhook", async (req: Request, res: Response) => {
  let event = req.body;

  // Verify webhook signature if secret is configured
  if (endpointSecret) {
    const signature = req.headers["stripe-signature"] as string;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        endpointSecret
      );
    } catch (error: any) {
      console.log(`Webhook signature verification failed: ${error.message}`);
      return res.status(400).json({ message: "Failed signature verification" });
    }
  }

  // Handle the event
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const invoiceId = session.metadata?.invoiceId;

        if (invoiceId) {
          await Invoice.findByIdAndUpdate(invoiceId, {
            status: "paid",
            paidAt: new Date(),
            stripePaymentIntentId: session.payment_intent,
          });
          console.log(
            `Invoice ${invoiceId} marked as paid (checkout completed)`
          );
        }
        break;
      }
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const invoiceId = paymentIntent.metadata?.invoiceId;
        if (invoiceId) {
          await Invoice.findByIdAndUpdate(invoiceId, {
            status: "paid",
            paidAt: new Date(),
            stripePaymentIntentId: paymentIntent.id,
          });
          console.log(`Invoice ${invoiceId} payment confirmed`);
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        const invoiceId = paymentIntent.metadata?.invoiceId;
        if (invoiceId) {
          console.log(`Payment failed for invoice ${invoiceId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// where customers land after successful payment

router.get("/success", async (req: Request, res: Response) => {
  const { invoiceId, session_id } = req.query;

  try {
    if (session_id && invoiceId) {
      // Just verify payment happened - don't update database (webhook does that)
      const session = await stripe.checkout.sessions.retrieve(
        session_id as string
      );

      if (session.payment_status === "paid") {
        // Get current invoice status (webhook should have updated it)
        const invoice = await Invoice.findById(invoiceId);

        return res.json({
          success: true,
          message: "Payment successful! Thank you for your payment.",
          invoiceId,
          invoice,
          paymentStatus: session.payment_status,
        });
      } else {
        return res.json({
          success: false,
          message: "Payment not completed yet.",
          invoiceId,
          paymentStatus: session.payment_status,
        });
      }
    }

    res.json({
      success: true,
      message: "Payment processed!",
      invoiceId,
    });
  } catch (error) {
    console.error("Error handling payment success", error);
    res.status(500).json({ error: "Error processing payment confirmation" });
  }
});

// Cancel endpoint - where customers land if they cancel payment
router.get("/cancel", (req: Request, res: Response) => {
  const { invoiceId } = req.query;

  res.json({
    success: false,
    message: "Payment was cancelled. You can try again anytime.",
    invoiceId,
  });
});

export default router;
