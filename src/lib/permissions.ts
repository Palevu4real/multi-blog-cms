import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Add to the Permission type
export type Permission = 
  | "manage_members"
  | "manage_settings"
  | "publish_posts"
  | "edit_others_posts"
  | "manage_categories"
  | "moderate_comments"      // ← New permission
  | "delete_blog"
  | "view_analytics"
  | "comment_on_post";       // ← New permission

// Add to permissionMatrix
const permissionMatrix: Record<Permission, Role[]> = {
  delete_blog: ["OWNER"],
  manage_members: ["OWNER", "ADMIN"],
  manage_settings: ["OWNER", "ADMIN"],
  publish_posts: ["OWNER", "ADMIN", "EDITOR"],
  edit_others_posts: ["OWNER", "ADMIN", "EDITOR"],
  manage_categories: ["OWNER", "ADMIN", "EDITOR"],
  moderate_comments: ["OWNER", "ADMIN", "EDITOR"],  // ← New
  view_analytics: ["OWNER", "ADMIN", "EDITOR"],
  comment_on_post: ["OWNER", "ADMIN", "EDITOR", "AUTHOR"],  // ← New - all roles can comment
};

export async function getUserRole(userId: string, blogId: string): Promise<Role | null> {
  const member = await prisma.blogMember.findUnique({
    where: {
      userId_blogId: {
        userId,
        blogId,
      },
    },
    select: {
      role: true,
    },
  });

  return member?.role || null;
}

export async function hasPermission(
  userId: string,
  blogId: string,
  permission: Permission
): Promise<boolean> {
  const role = await getUserRole(userId, blogId);
  if (!role) return false;

  const allowedRoles = permissionMatrix[permission];
  return allowedRoles.includes(role);
}

export async function hasAnyPermission(
  userId: string,
  blogId: string,
  permissions: Permission[]
): Promise<boolean> {
  for (const permission of permissions) {
    if (await hasPermission(userId, blogId, permission)) {
      return true;
    }
  }
  return false;
}

export async function getBlogWithAccess(userId: string, blogId: string) {
  const blog = await prisma.blog.findUnique({
    where: { id: blogId },
    include: {
      members: {
        where: { userId },
        select: {
          role: true,
        },
      },
    },
  });

  if (!blog) return null;
  if (blog.members.length === 0) return null;

  return {
    ...blog,
    role: blog.members[0].role,
  };
}

export async function isBlogMember(userId: string, blogId: string): Promise<boolean> {
  const member = await prisma.blogMember.findUnique({
    where: {
      userId_blogId: {
        userId,
        blogId,
      },
    },
  });

  return !!member;
}