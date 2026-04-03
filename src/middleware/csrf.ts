import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function generateCSRFToken(): string {
  return crypto.randomUUID();
}

export function validateCSRFToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const csrfTokenFromHeader = req.headers["x-csrf-token"];
  const csrfTokenFromCookie = req.cookies.csrfToken;
  const method = req.method;
  const path = req.path;

  if (!csrfTokenFromHeader || Array.isArray(csrfTokenFromHeader)) {
    console.warn(
      `[CSRF] Missing header token - Method: ${method}, Path: ${path}, HasCookie: ${!!csrfTokenFromCookie}`,
    );
    return res.status(403).json({
      error: {
        message: "CSRF token missing from request header",
        code: "CSRF_TOKEN_MISSING",
      },
    });
  }

  if (!csrfTokenFromCookie) {
    console.warn(
      `[CSRF] Missing cookie token - Method: ${method}, Path: ${path}, HasHeader: !!true`,
    );
    return res.status(403).json({
      error: {
        message: "CSRF token missing from cookies",
        code: "CSRF_TOKEN_MISSING",
      },
    });
  }

  if (csrfTokenFromHeader !== csrfTokenFromCookie) {
    console.warn(
      `[CSRF] Token mismatch - Method: ${method}, Path: ${path}, HeaderLength: ${(csrfTokenFromHeader as string).length}, CookieLength: ${csrfTokenFromCookie.length}`,
    );
    return res.status(403).json({
      error: {
        message: "CSRF token validation failed",
        code: "CSRF_TOKEN_INVALID",
      },
    });
  }

  next();
}
