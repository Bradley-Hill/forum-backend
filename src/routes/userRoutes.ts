import express from "express";
import bcrypt from "bcrypt";
import pool from "../db/pool";
import {
  findUserByUsername,
  findUserByEmail,
  updateUser,
  findUserWithHashById,
} from "../repositories/userRepository";
import { authenticateToken } from "../middleware/authenticate";

const router = express.Router();

router.get("/users/:username", async (req, res) => {
  try {
    const { username } = req.params;

    const user = await findUserByUsername(username);
    if (!user) {
      return res.status(404).json({
        error: {
          message: "User not found",
          code: "USER_NOT_FOUND",
        },
      });
    }

    res.json({ data: user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "DATABASE_ERROR",
      },
    });
  }
});

router.patch("/users/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { email, currentPassword, newPassword } = req.body;

    if (email === undefined && newPassword === undefined) {
      return res.status(400).json({
        error: {
          message: "At least one of email or newPassword must be provided",
          code: "VALIDATION_ERROR",
        },
      });
    }

    const fields: { email?: string; password_hash?: string } = {};

    if (email !== undefined) {
      if (typeof email !== "string" || email.trim() === "") {
        return res.status(400).json({
          error: {
            message: "Email must be a non-empty string",
            code: "VALIDATION_ERROR",
          },
        });
      }
      const existingUser = await findUserByEmail(email.trim());
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({
          error: {
            message: "Email already in use",
            code: "EMAIL_ALREADY_EXISTS",
          },
        });
      }
      fields.email = email.trim();
    }

    if (newPassword !== undefined) {
      if (!currentPassword) {
        return res.status(400).json({
          error: {
            message: "currentPassword is required to set a new password",
            code: "VALIDATION_ERROR",
          },
        });
      }

      const user = await findUserWithHashById(userId);
      if (!user) {
        return res.status(404).json({
          error: {
            message: "User not found",
            code: "USER_NOT_FOUND",
          },
        });
      }

      const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({
          error: {
            message: "Current password is incorrect",
            code: "INVALID_CREDENTIALS",
          },
        });
      }

      fields.password_hash = await bcrypt.hash(newPassword, 10);
    }

    const updated = await updateUser(userId, fields);
    res.json({ data: updated });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "DATABASE_ERROR",
      },
    });
  }
});

export default router;