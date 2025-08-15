import express from "express";
import type { Request, Response } from "express";
import Invoice from "../models/Invoice.ts";
import { verifyToken } from "../middleware/authMiddleware.ts";
import { validateBody } from "../middleware/validation.ts";
import {
  CreateInvoiceSchema,
  UpdateInvoiceSchema,
} from "../validation/invoiceValidation.ts";
import { stripe } from "../config/stripe.ts";

const router = express.Router();

// GET /api/invoices - Get all invoices for the authenticated user
router.get("/", verifyToken, async (req: Request, res: Response) => {
  try {
    const ownerId = req.user?.id;
    if (!ownerId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    const invoices = await Invoice.find({ ownerId });
    return res.status(200).json({ invoices });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching Invoice", error });
  }
});

// GET /api/invoices/id - Get a invoice for the authenticated user
router.get("/:id", verifyToken, async (req: Request, res: Response) => {
  try {
    const ownerId = req.user?.id;
    const { id } = req.params;
    if (!ownerId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const invoice = await Invoice.findOne({ _id: id, ownerId });
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    return res.status(200).json({ invoice });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching invoice", error });
  }
});

// POST /api/invoices - create a invoice for authenticated user
router.post(
  "/",
  verifyToken,
  validateBody(CreateInvoiceSchema),
  async (req: Request, res: Response) => {
    try {
      const ownerId = req.user?.id;
      if (!ownerId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Calculate total from items
      const total = req.body.items.reduce((sum: number, item: any) => {
        return sum + item.quantity * item.price;
      }, 0);

      // Generate unique invoice number
      const invoiceNumber = `INV-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)
        .toUpperCase()}`;

      // Create invoice with auto-generated fields
      const invoiceData = {
        ...req.body,
        ownerId,
        total,
        invoiceNumber,
        status: "pending",
        dueDate: new Date(req.body.dueDate),
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();

      return res.status(201).json({
        message: "Invoice created successfully",
        invoice,
      });
    } catch (error) {
      return res.status(500).json({ message: "Error creating invoice", error });
    }
  }
);

router.put(
  "/:id",
  verifyToken,
  validateBody(UpdateInvoiceSchema),
  async (req: Request, res: Response) => {
    try {
      const ownerId = req.user?.id;
      const { id } = req.params;
      if (!ownerId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const invoice = await Invoice.findOneAndUpdate(
        { _id: id, ownerId },
        req.body,
        {
          new: true, // return updated document to client
          runValidators: true, // validates against schema
        }
      );

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      return res.status(200).json({ message: "Invoice updated", invoice });
    } catch (error) {
      return res.status(500).json({ message: "Error updating invoice", error });
    }
  }
);

router.delete("/:id", verifyToken, async (req: Request, res: Response) => {
  try {
    const ownerId = req.user?.id;
    const { id } = req.params;
    if (!ownerId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const invoice = await Invoice.findOneAndDelete({ _id: id, ownerId });
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    return res.status(200).json({ message: "Invoice deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Error deleting invoice", error });
  }
});

// stripe

// returns stripe payment page url
router.post(
  "/:id/payment-link",
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const ownerId = req.user?.id;
      const { id } = req.params;

      if (!ownerId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const invoice = await Invoice.findOne({ _id: id, ownerId });
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      if (invoice.status === "paid") {
        return res.status(400).json({ message: "Invoice already paid" });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `http://localhost:8001/api/payments/success?invoiceId=${invoice.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:
          "http://localhost:8001/api/payments/cancel?invoiceId=" + invoice.id,
        customer_email: invoice.clientEmail,
        line_items: invoice.items.map((item) => ({
          price_data: {
            currency: "usd",
            product_data: {
              name: item.description,
            },
            unit_amount: Math.round(item.price * 100),
          },
          quantity: item.quantity,
        })),
        metadata: { invoiceId: invoice.id },
        payment_intent_data: {
          metadata: {
            invoiceId: invoice.id,
          },
        },
      });

      return res.json({ url: session.url, sessionId: session.id });
    } catch (error) {
      console.error("Error creating payment link:", error);
      return res
        .status(500)
        .json({ message: "Error creating payment link", error });
    }
  }
);

// TODO: Email invoices to client w/ payment link (feature for later)
// router.get("/:id/send", (req: Request, res: Response) => {
//   // Email functionality to be implemented later
// });

export default router;
