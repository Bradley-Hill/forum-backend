import { Request, Response, NextFunction } from "express";
import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");

export function validateUUIDParam(paramName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const paramValue = req.params[paramName];
    const validation = uuidSchema.safeParse(paramValue);

    if (!validation.success) {
      return res.status(400).json({
        error: {
          message: `Invalid ${paramName} format`,
          code: "INVALID_PARAMETER",
          details: validation.error.issues,
        },
      });
    }

    req.params[paramName] = validation.data;
    next();
  };
}
