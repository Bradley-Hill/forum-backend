import { JwtPayload } from "jsonwebtoken";

export interface AuthTokenPayload extends JwtPayload {
    id: string;
    username: string;
    role: "member" | "admin";
}
