import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.ts";
import authRoutes from "./routes/auth.ts";
import protectedRoutes from "./routes/protectedRoutes.ts";
import invoiceRoutes from "./routes/invoices.ts";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;

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
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api", protectedRoutes);
app.use("/api/invoices", invoiceRoutes);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
