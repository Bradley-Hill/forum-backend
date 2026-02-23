import express from "express";
import {
  getAllCategories,
  getCategoryBySlug,
  createCategory,
} from "../repositories/categoryRepository";
import { Category } from "../types/category";
import { getThreadsByCategory } from "../repositories/threadRepository";
import { validatePaginationParams } from "../utils/pagination";
import { authenticateToken } from "../middleware/authenticate";
import { requireAdmin } from "../middleware/requireAdmin";

const router = express.Router();

router.get("/categories", async (req, res) => {
  try {
    const categories: Category[] = await getAllCategories();
    res.json({ data: categories });
  } catch (error) {
    res.status(500).json({
      error: {
        message: "Failed to fetch categories",
        code: "DATABASE_ERROR",
      },
    });
  }
});

router.get("/categories/:slug/threads", async (req, res) => {
  try {
    const { slug } = req.params;

    const pagination = validatePaginationParams(
      req.query.page,
      req.query.pageSize,
    );
    if (!pagination.valid) {
      return res.status(400).json({ error: pagination.error });
    }

    const { page, pageSize } = pagination;

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
    res.status(500).json({
      error: {
        message: "Failed to fetch threads for category",
        code: "DATABASE_ERROR",
      },
    });
  }
});

router.post("/categories", authenticateToken, requireAdmin, async(req,res)=>{
  try {
    const {name, description} = req.body;
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({
        error: {
          message: "Category name is required and must be a non-empty string",
          code: "INVALID_CATEGORY_NAME",
        },
      });
    }
    const trimmedName = name.trim();
    const slug = trimmedName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');

    const category = await createCategory(slug, trimmedName, description);
    res.status(201).json({ data: category });
  } catch (error) {
    res.status(500).json({
      error: {
        message: "Failed to create category",
        code: "DATABASE_ERROR",
      },
    });
  }
});

export default router;
