export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: "member" | "admin";
  created_at: Date;
}

export interface PublicUser {
  id: string;
  username: string;
  role: "member" | "admin";
  created_at: Date;
}

export interface RegisteredUser {
  id: string;
  username: string;
  email: string;
}
