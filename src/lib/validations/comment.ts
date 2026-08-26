import { z } from "zod";

// Comment creation schema
export const createCommentSchema = z.object({
  content: z.string().min(1, "Comment content is required").max(10000, "Comment is too long"),
  parentId: z.string().optional(), // For nested comments
});

// Comment update schema
export const updateCommentSchema = z.object({
  content: z.string().min(1, "Comment content is required").max(10000, "Comment is too long"),
});

// Comment query params schema
export const commentQuerySchema = z.object({
  postId: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "SPAM", "TRASHED"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});