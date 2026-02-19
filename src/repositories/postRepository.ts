import pool from "../db/pool";
import { mapPostRow } from "../mapping/postMapping";
import { Post } from "../types/post";

export async function getPostsByThread(threadId:string, page: number, pageSize: number = 20): Promise<{posts: Post[]; totalCount: number}> {
  const client = await pool.connect();
  try {
    const countResult = await client.query(
      "SELECT COUNT(*) FROM posts WHERE thread_id = $1",
      [threadId]
    );
    const totalCount = parseInt(countResult.rows[0].count);

    const offset = (page - 1) * pageSize;
    const result = await client.query(
      "SELECT posts.id, posts.thread_id, posts.content, posts.created_at, posts.updated_at, users.id AS author_id, users.username FROM posts JOIN users ON posts.author_id = users.id WHERE posts.thread_id = $1 ORDER BY posts.created_at ASC LIMIT $2 OFFSET $3",
      [threadId, pageSize, offset]
    );
    const posts = result.rows.map(mapPostRow);
    return { posts, totalCount };
  } catch (error) {
    console.error(`Error fetching posts for thread ${threadId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}