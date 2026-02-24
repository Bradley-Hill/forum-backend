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

export async function getCategoryBySlug(
  slug: string,
): Promise<Category | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, slug, name, description FROM categories WHERE slug = $1",
      [slug],
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error(`Error fetching category with slug ${slug}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function createCategory(
  slug: string,
  name: string,
  description: string,
): Promise<Category> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "INSERT INTO categories (slug,name,description) VALUES ($1,$2,$3) RETURNING id,slug,name,description",
      [slug, name, description],
    );
    return result.rows[0];
  } catch (error) {
    console.error(`Error creating category with slug ${slug}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getCategoryById(
  categoryId: string,
): Promise<Category | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, slug, name, description FROM categories WHERE id = $1",
      [categoryId],
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error(`Error fetching category with id ${categoryId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`DELETE FROM categories WHERE id = $1`, [categoryId]);
  } catch (error) {
    console.error(`Error deleting category ${categoryId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export async function updateCategory(
  categoryId: string,
  fields: { name?: string; slug?: string; description?: string },
): Promise<Category> {
  const client = await pool.connect();
  try {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (fields.slug !== undefined) {
      setClauses.push(`slug = $${paramIndex++}`);
      values.push(fields.slug);
    }
    if (fields.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(fields.name);
    }
    if (fields.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(fields.description);
    }

    values.push(categoryId);
    const result = await client.query(
      `UPDATE categories SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING id, slug, name, description`,
      values,
    );
    return result.rows[0];
  } catch (error) {
    console.error(`Error updating category ${categoryId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}
