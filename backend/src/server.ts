import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.ts";
import authRoutes from "./routes/auth.ts";
import protectedRoutes from "./routes/protectedRoutes.ts";
import invoiceRoutes from "./routes/invoices.ts";
import paymentRoutes from "./routes/payments.ts";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;

// Stripe webhook needs raw body, so we exclude it from JSON parsing
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

//root route
app.get("/", (req, res) => {
  res.json({
    message: "InvoiceFlow API Server is running!",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      public: "/api/public",
      protected: "/api/protected",
      invoices: "/api/invoices",
      payments: "/api/payments",
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api", protectedRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
