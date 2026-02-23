import express from "express";
import { createPost } from "../repositories/postRepository";
import { getThreadById } from "../repositories/threadRepository";
import { authenticateToken } from "../middleware/authenticate";

const router = express.Router();

router.post("/posts", authenticateToken, async (req, res) => {
  try {
    const { thread_id, content } = req.body;
    const authorId = req.user!.id;

    if (!thread_id || !content || content.trim() === "") {
      return res.status(400).json({
        error: {
          message: "Thread ID and content are required",
          code: "MISSING_FIELDS",
        },
      });
    }

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
        code: "INTERNAL_SERVER_ERROR",
      },
    });
  }
});

export default router;
