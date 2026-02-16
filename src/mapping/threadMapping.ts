import { Thread } from '../types/thread';

export function mapThreadRow(row: any): Thread {
  return {
    id: row.id,
    title: row.title,
    is_sticky: row.is_sticky,
    is_locked: row.is_locked,
    created_at: row.created_at,
    updated_at: row.updated_at,
    category_id: row.category_id,
    author: {
      id: row.author_id,
      username: row.username,
    },
    reply_count: parseInt(row.reply_count),
  };
}