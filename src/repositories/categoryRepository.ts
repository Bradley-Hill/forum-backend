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

export async function getCategoryBySlug(slug:string): Promise<Category | null> {
    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT id, slug, name, description FROM categories WHERE slug = $1",
            [slug]
        );
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error(`Error fetching category with slug ${slug}:`, error);
        throw error;
    } finally {
        client.release();
    }
}