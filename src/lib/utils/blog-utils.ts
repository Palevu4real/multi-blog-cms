export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
}

export async function isSlugAvailable(slug: string, excludeBlogId?: string): Promise<boolean> {
  const { prisma } = await import("@/lib/prisma");
  
  const existing = await prisma.blog.findFirst({
    where: {
      slug,
      NOT: {
        id: excludeBlogId,
      },
    },
  });

  return !existing;
}