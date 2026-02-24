import { getPostsByThread } from "../repositories/postRepository";
import {
  getThreadById,
  createThreadWithPost,
  updateThread,
  deleteThread,
} from "../repositories/threadRepository";
import express from "express";
import { Thread } from "../types/thread";
import { validatePaginationParams } from "../utils/pagination";
import { authenticateToken } from "../middleware/authenticate";

const router = express.Router();

router.get("/threads/:id", async (req, res) => {
  try {
    const id = req.params.id as string;

    const pagination = validatePaginationParams(
      req.query.page,
      req.query.pageSize,
    );
    if (!pagination.valid) {
      return res.status(400).json({ error: pagination.error });
    }

    const { page, pageSize } = pagination;

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
  try {
    const { title, category_id, content } = req.body;
    const userId = req.user?.id;

    if (!title || title.trim() === "") {
      return res.status(400).json({
        error: {
          message: "Title is required",
          code: "VALIDATION_ERROR",
        },
      });
    }
    if (!category_id) {
      return res.status(400).json({
        error: {
          message: "Category ID is required",
          code: "VALIDATION_ERROR",
        },
      });
    }
    if (!userId) {
      return res.status(401).json({
        error: {
          message: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        },
      });
    }
    if (!content || content.trim() === "") {
      return res.status(400).json({
        error: {
          message: "Content is required",
          code: "VALIDATION_ERROR",
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
  try {
    const id = req.params.id as string;
    const { title } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({
        error: {
          message: "Title is required",
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

    if (req.user!.role !== "admin" && thread.author.id !== req.user!.id) {
      return res.status(403).json({
        error: {
          message: "Forbidden",
          code: "FORBIDDEN",
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
