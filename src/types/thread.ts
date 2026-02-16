export interface Thread {
  id: string;
  category_id: string;
  author: {
    id: string;
    username: string;
  };
  title: string;
  reply_count: number;
  is_locked: boolean;
  is_sticky: boolean;
  created_at: Date;
  updated_at: Date;
}
