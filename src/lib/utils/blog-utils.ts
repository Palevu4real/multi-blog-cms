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
      NOT: excludeBlogId ? { id: excludeBlogId } : undefined,
    },
  });

  return !existing;
}

// NEW: Generate post slug with blog context
export async function generatePostSlug(
  title: string, 
  blogId: string, 
  excludePostId?: string
): Promise<string> {
  const { prisma } = await import("@/lib/prisma");
  
  let slug = generateSlug(title);
  let finalSlug = slug;
  let counter = 1;
  
  while (true) {
    const existing = await prisma.post.findFirst({
      where: {
        slug: finalSlug,
        blogId,
        NOT: excludePostId ? { id: excludePostId } : undefined,
      },
    });
    
    if (!existing) break;
    
    finalSlug = `${slug}-${counter}`;
    counter++;
  }
  
  return finalSlug;
}

// NEW: Generate excerpt from content
export function generateExcerpt(content: any, maxLength: number = 160): string {
  if (!content) return "";
  
  try {
    // Extract text from Tiptap JSON content
    let text = "";
    if (content.content) {
      for (const node of content.content) {
        if (node.content) {
          for (const child of node.content) {
            if (child.text) {
              text += child.text + " ";
            }
          }
        }
      }
    }
    
    text = text.trim();
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  } catch (error) {
    console.error("Error generating excerpt:", error);
    return "";
  }
}