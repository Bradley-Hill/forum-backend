import { getPostsByThread } from "../repositories/postRepository";
import {
  threadCreateSchema,
  threadUpdateSchema,
  threadLockSchema,
  threadStickySchema,
} from "@Bradley-Hill/forum-schemas";
import { paginationSchema } from "@Bradley-Hill/forum-schemas";
import {
  getThreadById,
  createThreadWithPost,
  updateThread,
  setThreadLocked,
  setThreadSticky,
  deleteThread,
} from "../repositories/threadRepository";
import express from "express";
import { Thread } from "../types/thread";
import { authenticateToken } from "../middleware/authenticate";
import { requireAdmin } from "../middleware/requireAdmin";

const router = express.Router();

router.get("/threads/:id", async (req, res) => {
  try {
    const id = req.params.id as string;

    const parseResult = paginationSchema.safeParse({
      page: req.query.page as string | undefined,
      pageSize: req.query.pageSize as string | undefined,
    });
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          message: "Validation error",
          code: "VALIDATION_ERROR",
          details: parseResult.error.issues,
        },
      });
    }

    const { page, pageSize } = parseResult.data;

    const thread = await getThreadById(id);
    if (!thread) {
      return res.status(404).json({
        error: {
          message: "Thread not found",
          code: "THREAD_NOT_FOUND",
        },
      });
    }
    const {
      id: threadId,
      title,
      is_sticky,
      is_locked,
      created_at,
      author,
    } = thread as Thread;

    const { posts, totalCount } = await getPostsByThread(
      threadId,
      page,
      pageSize,
    );

    res.json({
      data: {
        thread: {
          id: threadId,
          title,
          is_sticky,
          is_locked,
          created_at,
          author,
        } as Thread,
        posts,
        pagination: {
          page,
          pageSize,
          totalPosts: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching thread:", error);
    res.status(500).json({
      error: {
        message: "Failed to fetch thread posts",
        code: "DATABASE_ERROR",
      },
    });
  }
});

router.post("/threads", authenticateToken, async (req, res) => {
  const parseresult = threadCreateSchema.safeParse(req.body);
  if (!parseresult.success) {
    return res.status(400).json({
      error: {
        message: "Validation error",
        code: "VALIDATION_ERROR",
        details: parseresult.error.issues,
      },
    });
  }
  try {
    const { title, category_id, content } = parseresult.data;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: {
          message: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        },
      });
    }
    const thread = await createThreadWithPost(
      category_id,
      title,
      userId,
      content,
    );

    res.status(201).json({
      data: thread,
    });
  } catch (error) {
    console.error("Error creating thread:", error);
    res.status(500).json({
      error: {
        message: "Failed to create thread",
        code: "DATABASE_ERROR",
      },
    });
  }
});

router.patch("/threads/:id", authenticateToken, async (req, res) => {
  const parseResult = threadUpdateSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        message: "Validation error",
        code: "VALIDATION_ERROR",
        details: parseResult.error.issues,
      },
    });
  }
  try {
    const id = req.params.id as string;
    const { title } = parseResult.data;

    const thread = await getThreadById(id);
    if (!thread) {
      return res.status(404).json({
        error: {
          message: "Thread not found",
          code: "THREAD_NOT_FOUND",
        },
      });
    }

    if (
      req.user!.role !== "admin" &&
      (thread.author.id !== req.user!.id || thread.is_locked)
    ) {
      return res.status(403).json({
        error: {
          message: thread.is_locked ? "Thread is locked" : "Forbidden",
          code: thread.is_locked ? "THREAD_LOCKED" : "FORBIDDEN",
        },
      });
    }

    const updated = await updateThread(id, title);
    res.json({ data: updated });
  } catch (error) {
    console.error("Error updating thread:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "DATABASE_ERROR",
      },
    });
  }
});

router.delete("/threads/:id", authenticateToken, async (req, res) => {
  try {
    const id = req.params.id as string;

    const thread = await getThreadById(id);
    if (!thread) {
      return res.status(404).json({
        error: {
          message: "Thread not found",
          code: "THREAD_NOT_FOUND",
        },
      });
    }

    if (req.user!.role !== "admin" && thread.author.id !== req.user!.id) {
      return res.status(403).json({
        error: {
          message: "Forbidden",
          code: "FORBIDDEN",
        },
      });
    }

    router.patch(
      "/threads/:id/lock",
      authenticateToken,
      requireAdmin,
      async (req, res) => {
        try {
          const id = req.params.id as string;
          const { is_locked } = req.body;

          if (typeof is_locked !== "boolean") {
            return res.status(400).json({
              error: {
                message: "is_locked must be a boolean",
                code: "VALIDATION_ERROR",
              },
            });
          }

          const thread = await getThreadById(id);
          if (!thread) {
            return res.status(404).json({
              error: {
                message: "Thread not found",
                code: "THREAD_NOT_FOUND",
              },
            });
          }

          const updated = await setThreadLocked(id, is_locked);
          res.json({ data: updated });
        } catch (error) {
          console.error("Error updating thread lock status:", error);
          res.status(500).json({
            error: {
              message: "Internal server error",
              code: "DATABASE_ERROR",
            },
          });
        }
      },
    );

    router.patch(
      "/threads/:id/sticky",
      authenticateToken,
      requireAdmin,
      async (req, res) => {
        try {
          const id = req.params.id as string;
          const { is_sticky } = req.body;

          if (typeof is_sticky !== "boolean") {
            return res.status(400).json({
              error: {
                message: "is_sticky must be a boolean",
                code: "VALIDATION_ERROR",
              },
            });
          }

          const thread = await getThreadById(id);
          if (!thread) {
            return res.status(404).json({
              error: {
                message: "Thread not found",
                code: "THREAD_NOT_FOUND",
              },
            });
          }

          const updated = await setThreadSticky(id, is_sticky);
          res.json({ data: updated });
        } catch (error) {
          console.error("Error updating thread sticky status:", error);
          res.status(500).json({
            error: {
              message: "Internal server error",
              code: "DATABASE_ERROR",
            },
          });
        }
      },
    );

    await deleteThread(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting thread:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "DATABASE_ERROR",
      },
    });
  }
});

export default router;
