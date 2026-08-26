import { z } from "zod";

// Post creation schema
export const createPostSchema = z.object({
  blogId: z.string().min(1, "Blog ID is required"),
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  content: z.any().optional(), // Tiptap JSON content
  excerpt: z.string().max(500, "Excerpt is too long").optional(),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  featuredImage: z.string().url("Invalid image URL").optional(),
  categoryIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  publishedAt: z.string().datetime().optional(),
});

// Post update schema
export const updatePostSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long").optional(),
  content: z.any().optional(),
  excerpt: z.string().max(500, "Excerpt is too long").optional(),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]).optional(),
  featuredImage: z.string().url("Invalid image URL").optional(),
  publishedAt: z.string().datetime().optional(),
});

// Category creation schema
export const createCategorySchema = z.object({
  blogId: z.string().min(1, "Blog ID is required"),
  name: z.string().min(1, "Category name is required").max(50, "Category name is too long"),
  slug: z.string().max(50).optional(),
  description: z.string().max(200).optional(),
});

// Category update schema
export const updateCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(50, "Category name is too long").optional(),
  slug: z.string().max(50).optional(),
  description: z.string().max(200).optional(),
});

// Tag creation schema
export const createTagSchema = z.object({
  blogId: z.string().min(1, "Blog ID is required"),
  name: z.string().min(1, "Tag name is required").max(30, "Tag name is too long"),
  slug: z.string().max(30).optional(),
});

// Tag update schema
export const updateTagSchema = z.object({
  name: z.string().min(1, "Tag name is required").max(30, "Tag name is too long").optional(),
  slug: z.string().max(30).optional(),
});

// Post query params schema - ONLY ONE EXPORT
export const postQuerySchema = z.object({
  blogId: z.string().optional(),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]).optional(), // Made optional
  categoryId: z.string().optional(),
  tagId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sortBy: z.enum(["createdAt", "updatedAt", "publishedAt", "views"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});