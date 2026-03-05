import pool from "../db/pool";
import { User, PublicUser, RegisteredUser } from "../types/user";

export async function findUserByEmail(email: string): Promise<User | null> {
  const client = await pool.connect();
  try {
    const emailResult = await client.query(
      "SELECT id, username, email, password_hash, role, created_at FROM users WHERE email = $1",
      [email],
    );
    if (emailResult.rows.length === 0) {
      return null;
    }
    return emailResult.rows[0];
  } catch (error) {
    console.error(`Error fetching user by email ${email}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function findUserByUsername(
  username: string,
): Promise<PublicUser | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, username, role, created_at FROM users WHERE username = $1",
      [username],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  } catch (error) {
    console.error(`Error fetching user by username ${username}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function createUser(
  username: string,
  email: string,
  passwordHash: string,
): Promise<RegisteredUser> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, 'member') RETURNING id, username, email",
      [username, email, passwordHash],
    );
    return result.rows[0];
  } catch (error) {
    console.error(`Error creating user ${username}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function createRefreshToken(
  userId: string,
  token: string,
  expiresAt: Date,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [userId, token, expiresAt],
    );
  } catch (error) {
    console.error(`Error creating refresh token for user ${userId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteRefreshToken(token: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("DELETE FROM refresh_tokens WHERE token = $1", [token]);
  } catch (error) {
    console.error(`Error deleting refresh token ${token}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function findRefreshToken(
  token: string,
): Promise<{ user_id: string; expires_at: Date } | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT user_id, expires_at FROM refresh_tokens WHERE token = $1",
      [token],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  } catch (error) {
    console.error(`Error fetching refresh token ${token}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function findUserById(id: string): Promise<PublicUser | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, username, role, created_at FROM users WHERE id = $1",
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  } catch (error) {
    console.error(`Error fetching user by ID ${id}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function updateUser(
  userId: string,
  fields: { email?: string; password_hash?: string },
): Promise<RegisteredUser> {
  const client = await pool.connect();
  try {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (fields.email !== undefined) {
      setClauses.push(`email = $${paramIndex++}`);
      values.push(fields.email);
    }
    if (fields.password_hash !== undefined) {
      setClauses.push(`password_hash = $${paramIndex++}`);
      values.push(fields.password_hash);
    }

    values.push(userId);
    const result = await client.query(
      `UPDATE users SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING id, username, email`,
      values,
    );
    return result.rows[0];
  } catch (error) {
    console.error(`Error updating user ${userId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function findUserWithHashById(id: string): Promise<User | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, username, email, password_hash, role, created_at FROM users WHERE id = $1",
      [id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  } catch (error) {
    console.error(`Error fetching user with hash by ID ${id}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteUser(userId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("DELETE FROM users WHERE id = $1", [userId]);
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}