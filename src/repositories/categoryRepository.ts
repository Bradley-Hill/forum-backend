import pool from "../db/pool";
import { Category } from "../types/category";

export async function getAllCategories(): Promise<Category[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, slug, name, description, position FROM categories ORDER BY position ASC",
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
      "SELECT id, slug, name, description, position FROM categories WHERE slug = $1",
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
    const maxPosResult = await client.query(
      "SELECT COALESCE(MAX(position), -1) as max_pos FROM categories"
    );
    const nextPosition = (maxPosResult.rows[0].max_pos as number) + 1;

    const result = await client.query(
      "INSERT INTO categories (slug, name, description, position) VALUES ($1, $2, $3, $4) RETURNING id, slug, name, description, position",
      [slug, name, description, nextPosition],
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
      "SELECT id, slug, name, description, position FROM categories WHERE id = $1",
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
  fields: { name?: string; slug?: string; description?: string; position?: number },
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
    if (fields.position !== undefined) {
      setClauses.push(`position = $${paramIndex++}`);
      values.push(fields.position);
    }

    values.push(categoryId);
    const result = await client.query(
      `UPDATE categories SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING id, slug, name, description, position`,
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

export async function reorderCategories(
  categoryId: string,
  newPosition: number,
): Promise<Category[]> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      "SELECT position FROM categories WHERE id = $1",
      [categoryId],
    );

    if (currentResult.rows.length === 0) {
      throw new Error("Category not found");
    }

    const currentPosition = currentResult.rows[0].position as number;

    if (currentPosition === newPosition) {
      const result = await client.query(
        "SELECT id, slug, name, description, position FROM categories ORDER BY position ASC"
      );
      await client.query("COMMIT");
      return result.rows;
    }

    if (newPosition > currentPosition) {
      await client.query(
        "UPDATE categories SET position = position - 1 WHERE position > $1 AND position <= $2",
        [currentPosition, newPosition],
      );
    } else {
      await client.query(
        "UPDATE categories SET position = position + 1 WHERE position >= $1 AND position < $2",
        [newPosition, currentPosition],
      );
    }

    await client.query(
      "UPDATE categories SET position = $1 WHERE id = $2",
      [newPosition, categoryId],
    );

    const result = await client.query(
      "SELECT id, slug, name, description, position FROM categories ORDER BY position ASC"
    );

    await client.query("COMMIT");
    return result.rows;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`Error reordering categories:`, error);
    throw error;
  } finally {
    client.release();
  }
}
