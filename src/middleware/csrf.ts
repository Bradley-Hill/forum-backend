import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function generateCSRFToken(): string {
  return crypto.randomUUID();
}

export function validateCSRFToken(req: Request, res: Response, next: NextFunction) {
  const csrfTokenFromHeader = req.headers['x-csrf-token'] as string;
  const csrfTokenFromCookie = req.cookies.csrfToken;

  if (!csrfTokenFromHeader) {
    return res.status(403).json({
      error: {
        message: "CSRF token missing from request header",
        code: "CSRF_TOKEN_MISSING",
      },
    });
  }

  if (!csrfTokenFromCookie) {
    return res.status(403).json({
      error: {
        message: "CSRF token missing from cookies",
        code: "CSRF_TOKEN_MISSING",
      },
    });
  }

  if (csrfTokenFromHeader !== csrfTokenFromCookie) {
    return res.status(403).json({
      error: {
        message: "CSRF token validation failed",
        code: "CSRF_TOKEN_INVALID",
      },
    });
  }

  next();
}
