export interface Post {
  id: string;
  thread_id: string;
  author: {
    id: string;
    username: string;
  };
  content: string;
  created_at: Date;
  updated_at: Date;
}
