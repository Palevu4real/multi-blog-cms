import { z } from "zod";

// Blog creation schema
export const createBlogSchema = z.object({
  name: z.string().min(1, "Blog name is required").max(100, "Blog name is too long"),
  slug: z.string().min(1, "Slug is required").max(100, "Slug is too long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug can only contain lowercase letters, numbers, and hyphens")
    .optional(),
  description: z.string().max(500, "Description is too long").optional(),
  isPublic: z.boolean().default(true),
  timezone: z.string().default("UTC"),
});

// Blog update schema
export const updateBlogSchema = z.object({
  name: z.string().min(1, "Blog name is required").max(100, "Blog name is too long").optional(),
  description: z.string().max(500, "Description is too long").optional(),
  isPublic: z.boolean().optional(),
  timezone: z.string().optional(),
  logo: z.string().url("Logo must be a valid URL").optional(),
});

// Member invitation schema
export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "EDITOR", "AUTHOR"]),
});

// Member role update schema
export const updateMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "AUTHOR"]),
});

// Slug check schema
export const checkSlugSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
  blogId: z.string().optional(), // For update checks
});