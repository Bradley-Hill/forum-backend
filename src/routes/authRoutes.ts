import {
  findRefreshToken,
  findUserByEmail,
  findUserByUsername,
  createRefreshToken,
  createUser,
  deleteRefreshToken,
  findUserById,
} from "../repositories/userRepository";
import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const router = Router();

router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    if (!username || !email || !password) {
      return res.status(400).json({
        error: {
          message: "Username, email and password are required",
          code: "MISSING_FIELDS",
        },
      });
    }

    if (await findUserByUsername(username)) {
      return res.status(409).json({
        error: {
          message: "Username already exists",
          code: "USERNAME_ALREADY_EXISTS",
        },
      });
    }

    if (await findUserByEmail(email)) {
      return res.status(409).json({
        error: {
          message: "Email already exists",
          code: "EMAIL_ALREADY_EXISTS",
        },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser(username, email, passwordHash);
    res.status(201).json({ data: user });
  } catch (error) {
    console.error(`Error registering user ${username}:`, error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "INTERNAL_SERVER_ERROR",
      },
    });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        error: {
          message: "Email and password are required",
          code: "MISSING_FIELDS",
        },
      });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: {
          message: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
        },
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        error: {
          message: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
        },
      });
    }
    const accessToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_ACCESS_SECRET as string,
      { expiresIn: "1h" },
    );
    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await createRefreshToken(user.id, refreshToken, expiresAt);

    res.json({ data: { accessToken, refreshToken } });
  } catch (error) {
    console.error(`Error logging in user with email ${email}:`, error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "INTERNAL_SERVER_ERROR",
      },
    });
  }
});

router.post("/refresh", async (req, res) => {
    const { refreshToken } = req.body;
    try {
        if (!refreshToken) {
            return res.status(400).json({
                error: {
                    message: "Refresh token is required",
                    code: "MISSING_FIELDS",
                },
            });
        }

        const tokenRecord = await findRefreshToken(refreshToken);
        if (!tokenRecord || tokenRecord.expires_at < new Date()) {
            return res.status(401).json({
                error: {
                    message: "Invalid or expired refresh token",
                    code: "INVALID_REFRESH_TOKEN",
                },
            });
        }

        const user = await findUserById(tokenRecord.user_id);
        if (!user) {
            return res.status(401).json({
                error: {
                    message: "User not found",
                    code: "USER_NOT_FOUND",
                },
            });
        }

        const newAccessToken = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_ACCESS_SECRET as string,
            { expiresIn: "1h" },
        );

        res.json({ data: { accessToken: newAccessToken } });
    } catch (error) {
        console.error(`Error refreshing token ${refreshToken}:`, error);
        res.status(500).json({
            error: {
                message: "Internal server error",
                code: "INTERNAL_SERVER_ERROR",
            },
        });
    }
});

router.post("/logout", async (req, res) => {
    const { refreshToken } = req.body;
    try {
        if (!refreshToken) {
            return res.status(400).json({
                error: {
                    message: "Refresh token is required",
                    code: "MISSING_FIELDS",
                },
            });
        }

        await deleteRefreshToken(refreshToken);
        res.json({ data: { message: "Logged out successfully" } });
    } catch (error) {
        console.error(`Error logging out with refresh token ${refreshToken}:`, error);
        res.status(500).json({
            error: {
                message: "Internal server error",
                code: "INTERNAL_SERVER_ERROR",
            },
        });
    }
});

export default router;