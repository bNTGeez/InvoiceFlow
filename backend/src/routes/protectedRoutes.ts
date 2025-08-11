import express from "express";
import type { Request, Response } from "express";
import { verifyToken } from "../middleware/authMiddleware.ts";

const router = express.Router();

router.get("/public", (req: Request, res: Response) => {
  res.status(200).json({ message: "Anyone can see this" });
});

router.get("/protected", verifyToken, (req: Request, res: Response) => {
  res.status(200).json({ message: `Hello user ${req.user?.id}` });
});

export default router;
