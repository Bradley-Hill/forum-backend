import pool from "../db/pool";
import { mapPostRow } from "../mapping/postMapping";
import { Post } from "../types/post";

export async function getPostsByThread(
  threadId: string,
  page: number,
  pageSize: number = 20,
): Promise<{ posts: Post[]; totalCount: number }> {
  const client = await pool.connect();
  try {
    const countResult = await client.query(
      "SELECT COUNT(*) FROM posts WHERE thread_id = $1",
      [threadId],
    );
    const totalCount = parseInt(countResult.rows[0].count);

    const offset = (page - 1) * pageSize;
    const result = await client.query(
      "SELECT posts.id, posts.thread_id, posts.content, posts.created_at, posts.updated_at, users.id AS author_id, users.username FROM posts JOIN users ON posts.author_id = users.id WHERE posts.thread_id = $1 ORDER BY posts.created_at ASC LIMIT $2 OFFSET $3",
      [threadId, pageSize, offset],
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

export async function getPostById(postId: string): Promise<Post | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT
               posts.id,
               posts.thread_id,
               posts.content,
               posts.created_at,
               posts.updated_at,
               users.id AS author_id,
               users.username
             FROM posts
             JOIN users ON posts.author_id = users.id
             WHERE posts.id = $1`,
      [postId],
    );
    if (result.rows.length === 0) return null;
    return mapPostRow(result.rows[0]);
  } catch (error) {
    console.error(`Error fetching post by id ${postId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function createPost(
  threadId: string,
  content: string,
  authorId: string,
): Promise<Post> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO posts (thread_id, content, author_id) 
      VALUES ($1, $2, $3) 
      RETURNING id`,
      [threadId, content, authorId],
    );
    const postId = result.rows[0].id;
    const post = await getPostById(postId);
    if (!post) throw new Error("Failed to retrieve newly created post");
    return post;
  } catch (error) {
    console.error(`Error creating post in thread ${threadId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function updatePost(
  postId: string,
  content: string,
): Promise<Post> {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE posts SET content = $1, updated_at = NOW() WHERE id = $2`,
      [content, postId],
    );
    const post = await getPostById(postId);
    if (!post) throw new Error("Failed to retrieve updated post");
    return post;
  } catch (error) {
    console.error(`Error updating post ${postId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function deletePost(postId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`DELETE FROM posts WHERE id = $1`, [postId]);
  } catch (error) {
    console.error(`Error deleting post ${postId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}
