import express from "express";
import type { Request, Response } from "express";
import Invoice from "../models/Invoice.ts";
import { verifyToken } from "../middleware/authMiddleware.ts";
import { validateBody } from "../middleware/validation.ts";
import {
  CreateInvoiceSchema,
  UpdateInvoiceSchema,
} from "../validation/invoiceValidation.ts";

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

export default router;
