import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

interface JWTPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function verifyToken(req: Request, res: Response, next: NextFunction) {
  // checking if the authorization header is present in the request since it is required for the token to be present
  const auth = req.get("Authorization");
  if (!auth) {
    return res.status(401).json({ error: "Missing Authorization Header" });
  }
  // we use the token to verify the user to make sure that the user is who they say they are
  const token = auth?.startsWith("Bearer") ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Missing Token" });
  }
  try {
    const jwtSecret = process.env.JWT_SECRET as string;
    const decoded = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256"],
    }) as JWTPayload;
    req.user = {
      id: decoded.sub,
      role: decoded.role,
    };
    return next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({ error: "Invalid Token" });
  }
}
