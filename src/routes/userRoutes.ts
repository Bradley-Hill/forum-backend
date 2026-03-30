import express from "express";
import bcrypt from "bcrypt";
import { userUpdateSchema} from "@Bradley-Hill/forum-schemas/user";
import {
  findUserByUsername,
  findUserByEmail,
  updateUser,
  findUserWithHashById,
  deleteUser,
  findMeById,
} from "../repositories/userRepository";
import { getThreadsByUserId } from "../repositories/threadRepository";
import { authenticateToken } from "../middleware/authenticate";
import { validateCSRFToken } from "../middleware/csrf";

const router = express.Router();

router.get("/users/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const user = await findMeById(userId);
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
    console.error("Error fetching current user:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "DATABASE_ERROR",
      },
    });
  }
});

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

router.get("/users/:username/threads", async (req, res) => {
  try {
    const { username } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    const user = await findUserByUsername(username);
    if (!user) {
      return res.status(404).json({
        error: { message: "User not found", code: "USER_NOT_FOUND" },
      });
    }

    const { threads, totalCount } = await getThreadsByUserId(user.id, page, pageSize);
    res.json({
      data: {
        threads,
        pagination: {
          page,
          pageSize,
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user threads:", error);
    res.status(500).json({
      error: { message: "Internal server error", code: "DATABASE_ERROR" },
    });
  }
});

router.patch("/users/me", authenticateToken, validateCSRFToken, async (req, res) => {
  const parseResult = userUpdateSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: parseResult.error.issues,
    });
  }
  try {
    const userId = req.user!.id;
    const { email, currentPassword, newPassword } = parseResult.data;

    const fields: { email?: string; password_hash?: string } = {};

    if (email !== undefined) {
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

router.delete("/users/me", authenticateToken, validateCSRFToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    await deleteUser(userId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting user account:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "DATABASE_ERROR",
      },
    });
  }
});

export default router;