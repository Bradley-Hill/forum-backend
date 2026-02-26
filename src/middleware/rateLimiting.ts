import { rateLimit } from "express-rate-limit";
import { Request, Response, NextFunction } from "express";

export const rateLimiter =
  process.env.NODE_ENV === "test"
    ? (req: Request, res: Response, next: NextFunction) => next()
    : rateLimit({
        windowMs: 1 * 60 * 1000,
        max: 10,
        message:
          "Too many requests from this IP, please try again after 1 minute",
      });
