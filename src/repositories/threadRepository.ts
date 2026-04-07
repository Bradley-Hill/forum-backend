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
      `SELECT COUNT(*) 
       FROM threads 
       WHERE category_id = $1`,
      [categoryId],
    );
    const totalCount = parseInt(countResult.rows[0].count);

    const offset = (page - 1) * pageSize;
    const threadsResult = await client.query(
      `SELECT
         threads.id,
         threads.category_id,
         threads.title,
         threads.is_sticky,
         threads.is_locked,
         threads.created_at,
         threads.updated_at,
         users.id AS author_id,
         users.username,
         users.avatar_url,
         (SELECT COUNT(*) FROM posts WHERE posts.thread_id = threads.id) AS reply_count
       FROM threads
       JOIN users ON threads.author_id = users.id
       WHERE threads.category_id = $1
       ORDER BY threads.is_sticky DESC, threads.updated_at DESC
       LIMIT $2 OFFSET $3`,
      [categoryId, pageSize, offset],
    );

    const transformedThreads = threadsResult.rows.map(mapThreadRow);

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

export async function getThreadById(threadId: string): Promise<Thread | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT
         threads.id,
         threads.category_id,
         threads.title,
         threads.is_sticky,
         threads.is_locked,
         threads.created_at,
         threads.updated_at,
         users.id AS author_id,
         users.username,
         users.avatar_url,
         (SELECT COUNT(*) FROM posts WHERE posts.thread_id = threads.id) AS reply_count
       FROM threads
       JOIN users ON threads.author_id = users.id
       WHERE threads.id = $1`,
      [threadId],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapThreadRow(result.rows[0]);
  } catch (error) {
    console.error(`Error fetching Thread for Id ${threadId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getThreadsByUserId(
  userId: string,
  page: number,
  pageSize: number = 10,
): Promise<{ threads: Thread[]; totalCount: number }> {
  const client = await pool.connect();
  try {
    const countResult = await client.query(
      `SELECT COUNT(*) FROM threads WHERE author_id = $1`,
      [userId],
    );
    const totalCount = parseInt(countResult.rows[0].count);

    const offset = (page - 1) * pageSize;
    const threadsResult = await client.query(
      `SELECT
         threads.id,
         threads.category_id,
         threads.title,
         threads.is_sticky,
         threads.is_locked,
         threads.created_at,
         threads.updated_at,
         users.id AS author_id,
         users.username,
         users.avatar_url,
         (SELECT COUNT(*) FROM posts WHERE posts.thread_id = threads.id) AS reply_count
       FROM threads
       JOIN users ON threads.author_id = users.id
       WHERE threads.author_id = $1
       ORDER BY threads.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset],
    );

    return {
      threads: threadsResult.rows.map(mapThreadRow),
      totalCount,
    };
  } catch (error) {
    console.error(`Error fetching threads for user ${userId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function createThreadWithPost(
  categoryId: string,
  title: string,
  authorId: string,
  content: string,
): Promise<Thread> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const threadResult = await client.query(
      `INSERT INTO threads (category_id, title, author_id)
     VALUES ($1, $2, $3)
     RETURNING id`,
      [categoryId, title, authorId],
    );
    const threadId = threadResult.rows[0].id;

    await client.query(
      `INSERT INTO posts (thread_id, author_id, content)
     VALUES ($1, $2, $3)`,
      [threadId, authorId, content],
    );
    await client.query("COMMIT");

    const thread = await getThreadById(threadId);
    if (!thread) throw new Error("Failed to retrieve newly created thread");
    return thread;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(
      `Error creating thread with post in category ${categoryId}:`,
      error,
    );
    throw error;
  } finally {
    client.release();
  }
}

export async function updateThread(
  threadId: string,
  title: string,
): Promise<Thread> {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE threads SET title = $1, updated_at = NOW() WHERE id = $2`,
      [title, threadId],
    );
    const thread = await getThreadById(threadId);
    if (!thread) throw new Error("Failed to retrieve updated thread");
    return thread;
  } catch (error) {
    console.error(`Error updating thread ${threadId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function setThreadLocked(
  threadId: string,
  isLocked: boolean,
): Promise<Thread> {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE threads SET is_locked = $1, updated_at = NOW() WHERE id = $2`,
      [isLocked, threadId],
    );
    const thread = await getThreadById(threadId);
    if (!thread) throw new Error("Failed to retrieve updated thread");
    return thread;
  } catch (error) {
    console.error(`Error setting locked on thread ${threadId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function setThreadSticky(
  threadId: string,
  isSticky: boolean,
): Promise<Thread> {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE threads SET is_sticky = $1, updated_at = NOW() WHERE id = $2`,
      [isSticky, threadId],
    );
    const thread = await getThreadById(threadId);
    if (!thread) throw new Error("Failed to retrieve updated thread");
    return thread;
  } catch (error) {
    console.error(`Error setting sticky on thread ${threadId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteThread(threadId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`DELETE FROM threads WHERE id = $1`, [threadId]);
  } catch (error) {
    console.error(`Error deleting thread ${threadId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}
