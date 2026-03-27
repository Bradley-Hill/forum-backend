import express from "express";
import {postCreateSchema, postUpdateSchema} from "@Bradley-Hill/forum-schemas";
import {
  createPost,
  getPostById,
  updatePost,
  deletePost,
} from "../repositories/postRepository";
import { getThreadById } from "../repositories/threadRepository";
import { authenticateToken } from "../middleware/authenticate";
import { validateCSRFToken } from "../middleware/csrf";
import { validateUUIDParam } from "../middleware/validateParams";

const router = express.Router();

router.post("/posts", authenticateToken, validateCSRFToken, async (req, res) => {
  const parseResult = postCreateSchema.safeParse(req.body);
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
    const { thread_id, content } = parseResult.data;
    const authorId = req.user!.id;

    const thread = await getThreadById(thread_id);
    if (!thread) {
      return res.status(404).json({
        error: {
          message: "Thread not found",
          code: "THREAD_NOT_FOUND",
        },
      });
    }

    if (thread.is_locked) {
      return res.status(403).json({
        error: {
          message: "Thread is locked",
          code: "THREAD_LOCKED",
        },
      });
    }

    const post = await createPost(thread_id, content, authorId);
    res.status(201).json({ data: post });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "DATABASE_ERROR",
      },
    });
  }
});

router.patch("/posts/:id", validateUUIDParam("id"), authenticateToken, validateCSRFToken, async (req, res) => {
  const parseResult = postUpdateSchema.safeParse(req.body);
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
    const id = req.params.id;
    const { content } = parseResult.data;

    const post = await getPostById(id);
    if (!post) {
      return res.status(404).json({
        error: {
          message: "Post not found",
          code: "POST_NOT_FOUND",
        },
      });
    }

    if (req.user!.role !== "admin" && post.author.id !== req.user!.id) {
      return res.status(403).json({
        error: {
          message: "Forbidden",
          code: "FORBIDDEN",
        },
      });
    }

    const updated = await updatePost(id, content);
    res.json({ data: updated });
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "DATABASE_ERROR",
      },
    });
  }
});

router.delete("/posts/:id", validateUUIDParam("id"), authenticateToken, validateCSRFToken, async (req, res) => {
  try {
    const id = req.params.id;

    const post = await getPostById(id);
    if (!post) {
      return res.status(404).json({
        error: {
          message: "Post not found",
          code: "POST_NOT_FOUND",
        },
      });
    }

    if (req.user!.role !== "admin" && post.author.id !== req.user!.id) {
      return res.status(403).json({
        error: {
          message: "Forbidden",
          code: "FORBIDDEN",
        },
      });
    }

    await deletePost(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({
      error: {
        message: "Internal server error",
        code: "DATABASE_ERROR",
      },
    });
  }
});

export default router;
