import { getPostsByThread } from "../repositories/postRepository";
import { getThreadById } from "../repositories/threadRepository";
import express from "express";
import { Thread } from "../types/thread";
import { validatePaginationParams } from "../utils/pagination";

const router = express.Router();

router.get("/threads/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const pagination = validatePaginationParams(req.query.page, req.query.pageSize);
    if(!pagination.valid){
      return res.status(400).json({error: pagination.error});
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
