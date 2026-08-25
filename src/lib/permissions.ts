import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import type { Role } from '@prisma/client'

const ROLE_RANK: Record<Role, number> = {
  AUTHOR: 1,
  EDITOR: 2,
  ADMIN: 3,
  OWNER: 4,
}

export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.id) return null
  return session.user
}

/**
 * Throws if the current user isn't logged in, or doesn't hold at least
 * `minRole` on the given blog. Returns the membership row on success,
 * so callers can also read the exact role if needed.
 */
export async function requireBlogRole(blogId: string, minRole: Role) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('UNAUTHENTICATED')
  }

  const membership = await db.blogMember.findUnique({
    where: { userId_blogId: { userId: user.id, blogId } },
  })

  if (!membership || ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
    throw new Error('FORBIDDEN')
  }

  return membership
}

export async function getUserBlogRole(blogId: string) {
  const user = await getCurrentUser()
  if (!user) return null

  const membership = await db.blogMember.findUnique({
    where: { userId_blogId: { userId: user.id, blogId } },
  })

  return membership?.role ?? null
}