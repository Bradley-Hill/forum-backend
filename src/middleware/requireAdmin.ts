import { Request,Response,NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.user?.role !== "admin") {
        return res.status(403).json({
            error: {
                message: "Admin access required",
                code: "ADMIN_ACCESS_REQUIRED",
            },
        });
    }
    next();
}