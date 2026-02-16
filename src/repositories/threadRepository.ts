import pool from "../db/pool";
import { mapThreadRow } from "../mapping/threadMapping";
import { Thread } from "../types/thread";

export async function getThreadsByCategory(
  categoryId: string,
  page: number,
  pageSize: number = 20,
): Promise<{ threads: Thread[]; totalCount: number }> {
  const client = await pool.connect();
  try {
    const countResult = await client.query(
      "SELECT COUNT(*) FROM threads WHERE category_id = $1",
      [categoryId],
    );
    const totalCount = parseInt(countResult.rows[0].count);

    const offset = (page - 1) * pageSize;
    const threadsResult = await client.query(
      "SELECT threads.id, threads.category_id, threads.title, threads.is_sticky, threads.is_locked, threads.created_at, threads.updated_at, users.id AS author_id, users.username, (SELECT COUNT(*) FROM posts WHERE posts.thread_id = threads.id) AS reply_count FROM threads JOIN users ON threads.author_id = users.id WHERE threads.category_id = $1 ORDER BY threads.is_sticky DESC, threads.updated_at DESC LIMIT $2 OFFSET $3",
      [categoryId, pageSize, offset],
    );

    const transformedThreads = threadsResult.rows.map(mapThreadRow)
    
    return {
      threads: transformedThreads,
      totalCount: totalCount,
    };
  } catch (error) {
    console.error(`Error fetching threads for category ${categoryId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}
