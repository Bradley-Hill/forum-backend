import { Request,Response,NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthTokenPayload } from "../types/auth";

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies.accessToken;

    if (!token) {
        return res.status(401).json({
            error: {
                message: "Access token is missing",
                code: "ACCESS_TOKEN_MISSING",
            },
        });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as AuthTokenPayload;
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