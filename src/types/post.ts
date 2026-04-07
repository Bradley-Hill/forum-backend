export interface Post {
  id: string;
  thread_id: string;
  author: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  content: string;
  created_at: Date;
  updated_at: Date;
}
