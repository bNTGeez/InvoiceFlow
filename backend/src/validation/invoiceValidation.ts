import { z } from "zod";

// Schema for individual invoice items (what user provides)
const InvoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  price: z.number().positive("Price must be positive"),
});

// Schema for creating a new invoice (only what user needs to provide)
export const CreateInvoiceSchema = z.object({
  clientEmail: z.email("Must be a valid email"),
  items: z.array(InvoiceItemSchema).min(1, "At least one item is required"),
  dueDate: z.iso.datetime("Must be a valid ISO date"),
});

// Schema for updating an invoice (optional fields user can change)
export const UpdateInvoiceSchema = z.object({
  clientEmail: z.email("Must be a valid email").optional(),
  items: z
    .array(InvoiceItemSchema)
    .min(1, "At least one item is required")
    .optional(),
  dueDate: z.iso.datetime("Must be a valid ISO date").optional(),
  status: z.enum(["pending", "paid", "overdue"]).optional(),
});

// Type inference - TypeScript types automatically generated from schemas
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;
