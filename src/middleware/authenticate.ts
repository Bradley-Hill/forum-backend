import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthTokenPayload } from "../types/auth";

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({
      error: {
        message: "Access token is missing",
        code: "ACCESS_TOKEN_MISSING",
      },
    });
  }

  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    console.error("JWT_ACCESS_SECRET not configured");
    return res.status(500).json({
      error: {
        message: "Server configuration error",
        code: "SERVER_ERROR",
      },
    });
  }

  try {
    const payload = jwt.verify(token, secret) as AuthTokenPayload;

    // Validate required fields exist
    if (!payload.id || !payload.username) {
      throw new Error("JWT payload missing required fields");
    }

    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        message: "Invalid or expired access token",
        code: "INVALID_ACCESS_TOKEN",
      },
    });
  }
}
