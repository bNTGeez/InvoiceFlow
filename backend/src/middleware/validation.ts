import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

// Generic validation middleware
export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate the request body against the schema
      const validatedData = schema.parse(req.body);

      // Replace req.body with validated data (removes extra fields)
      req.body = validatedData;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Return detailed validation errors
        return res.status(400).json({
          message: "Validation failed",
          errors: error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }

      return res.status(500).json({ message: "Validation error" });
    }
  };
};
