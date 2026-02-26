import express from "express";
import {
  paginationSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
} from "@Bradley-Hill/forum-schemas";
import {
  getAllCategories,
  getCategoryBySlug,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../repositories/categoryRepository";
import { Category } from "../types/category";
import { getThreadsByCategory } from "../repositories/threadRepository";
import { authenticateToken } from "../middleware/authenticate";
import { requireAdmin } from "../middleware/requireAdmin";

const router = express.Router();

router.get("/categories", async (req, res) => {
  try {
    const categories: Category[] = await getAllCategories();
    res.json({ data: categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      error: {
        message: "Failed to fetch categories",
        code: "DATABASE_ERROR",
      },
    });
  }
});

router.get("/categories/:slug/threads", async (req, res) => {
  const parseResult = paginationSchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues });
  }
  const { page, pageSize } = parseResult.data;
  try {
    const slug = req.params.slug as string;

    const category = await getCategoryBySlug(slug);
    if (!category) {
      return res.status(404).json({
        error: {
          message: "Category not found",
          code: "CATEGORY_NOT_FOUND",
        },
      });
    }

    const { threads, totalCount } = await getThreadsByCategory(
      category.id,
      page,
      pageSize,
    );

    res.json({
      data: {
        category: {
          id: category.id,
          slug: category.slug,
          name: category.name,
        },
        threads,
        pagination: {
          page,
          pageSize,
          totalThreads: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching threads for category:", error);
    res.status(500).json({
      error: {
        message: "Failed to fetch threads for category",
        code: "DATABASE_ERROR",
      },
    });
  }
});

router.post(
  "/categories",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const parseResult = categoryCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.issues });
    }
    try {
      const { name, description } = parseResult.data;
      const trimmedName = name.trim();
      const slug = trimmedName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-]/g, "");

      const category = await createCategory(slug, trimmedName, description);
      res.status(201).json({ data: category });
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({
        error: {
          message: "Failed to create category",
          code: "DATABASE_ERROR",
        },
      });
    }
  },
);

router.delete(
  "/categories/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const id = req.params.id as string;

      const category = await getCategoryById(id);
      if (!category) {
        return res.status(404).json({
          error: {
            message: "Category not found",
            code: "CATEGORY_NOT_FOUND",
          },
        });
      }

      await deleteCategory(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({
        error: {
          message: "Internal server error",
          code: "DATABASE_ERROR",
        },
      });
    }
  },
);

router.patch(
  "/categories/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const parseResult = categoryUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.issues });
    }
    const { name, description } = parseResult.data;
    try {
      const id = req.params.id as string;

      const category = await getCategoryById(id);
      if (!category) {
        return res.status(404).json({
          error: {
            message: "Category not found",
            code: "CATEGORY_NOT_FOUND",
          },
        });
      }

      const fields: { name?: string; slug?: string; description?: string } = {};
      if (name !== undefined) {
        const trimmedName = name.trim();
        fields.name = trimmedName;
        fields.slug = trimmedName
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9\-]/g, "");
      }
      if (description !== undefined) {
        fields.description = description;
      }

      const updated = await updateCategory(id, fields);
      res.json({ data: updated });
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({
        error: {
          message: "Internal server error",
          code: "DATABASE_ERROR",
        },
      });
    }
  },
);

export default router;
