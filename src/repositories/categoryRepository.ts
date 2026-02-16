import pool from "../db/pool";
import { Category } from "../types/category";

export async function getAllCategories(): Promise<Category[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, slug, name, description FROM categories ORDER BY position ASC",
    );
    return result.rows;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  } finally {
    client.release();
  }
}
