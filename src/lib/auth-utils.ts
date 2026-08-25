import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cache } from "react";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

// Get current user server-side
export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      blogs: {
        include: {
          blog: true,
        },
      },
    },
  });

  return user;
});

// Require authentication - redirects if not logged in
export const requireAuth = cache(async () => {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }
  return user;
});

// Get blog with member check
export const getBlogWithAccess = cache(async (blogSlug: string, userId: string) => {
  const blog = await prisma.blog.findUnique({
    where: { slug: blogSlug },
    include: {
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!blog) return null;
  return blog;
});

// Check if user has role for a blog
export async function hasRole(
  userId: string,
  blogSlug: string,
  roles: Role[]
): Promise<boolean> {
  const blog = await prisma.blog.findUnique({
    where: { slug: blogSlug },
    include: {
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!blog) return false;
  if (blog.members.length === 0) return false;

  return roles.includes(blog.members[0].role);
}

// Check permission using role matrix
export async function checkPermission(
  userId: string,
  blogSlug: string,
  action: "manage_members" | "manage_settings" | "publish_posts" | "edit_others_posts" | "manage_categories" | "moderate_comments" | "delete_blog"
): Promise<boolean> {
  const blog = await prisma.blog.findUnique({
    where: { slug: blogSlug },
    include: {
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!blog) return false;
  if (blog.members.length === 0) return false;

  const role = blog.members[0].role;

  const permissionMap: Record<typeof action, Role[]> = {
    delete_blog: ["OWNER"],
    manage_members: ["OWNER", "ADMIN"],
    manage_settings: ["OWNER", "ADMIN"],
    publish_posts: ["OWNER", "ADMIN", "EDITOR"],
    edit_others_posts: ["OWNER", "ADMIN", "EDITOR"],
    manage_categories: ["OWNER", "ADMIN", "EDITOR"],
    moderate_comments: ["OWNER", "ADMIN", "EDITOR"],
  };

  return permissionMap[action].includes(role);
}