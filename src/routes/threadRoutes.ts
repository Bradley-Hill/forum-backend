import { getPostsByThread } from "../repositories/postRepository";
import { getThreadById } from "../repositories/threadRepository";
import express from "express";
import { Post } from "../types/post";
import { Thread } from "../types/thread";

const router = express.Router();

router.get("/threads/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 20;
    const thread = await getThreadById(id);
    if (!thread) {
        return res.status(404).json({
            error: {
                message: "Thread not found",
                code: "THREAD_NOT_FOUND",
            },
        });
    }
    const {id: threadId,title,is_sticky,is_locked,created_at,author} = thread as Thread;

    const { posts, totalCount } = await getPostsByThread(threadId, page, pageSize);

    res.json({
      data: {
        thread: { id: threadId, title, is_sticky, is_locked, created_at, author } as Thread,
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
    res.status(500).json({
      error: {
        message: "Failed to fetch thread posts",
        code: "DATABASE_ERROR",
      },
    });
  }
});

export default router;
