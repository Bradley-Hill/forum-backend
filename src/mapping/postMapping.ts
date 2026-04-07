import { Post } from "../types/post";

export function mapPostRow(row: any): Post {
  return {
    id: row.id,
    thread_id: row.thread_id,
    author: {
      id: row.author_id,
      username: row.username,
      avatar_url: row.avatar_url,
    },
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
