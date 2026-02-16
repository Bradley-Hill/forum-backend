import express from "express";
import { getAllCategories } from "../repositories/categoryRepository";
import { Category } from "../types/category";

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

export default router;
