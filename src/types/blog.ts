import { Blog, BlogMember, Role } from "@prisma/client";

export type BlogWithMember = Blog & {
  members: (BlogMember & {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
    };
  })[];
  role?: Role;
};

export type CreateBlogInput = {
  name: string;
  slug?: string;
  description?: string;
  isPublic?: boolean;
  timezone?: string;
};

export type UpdateBlogInput = {
  name?: string;
  description?: string;
  isPublic?: boolean;
  timezone?: string;
  logo?: string;
};

export type InviteMemberInput = {
  email: string;
  role: "ADMIN" | "EDITOR" | "AUTHOR";
};

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};