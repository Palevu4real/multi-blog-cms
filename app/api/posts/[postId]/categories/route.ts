import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserRole } from "@/lib/permissions";
import { z } from "zod";

const assignCategoriesSchema = z.object({
  categoryIds: z.array(z.string()),
});

// GET /api/posts/[postId]/categories - Get categories for a post
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { postId } = await params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        categories: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ categories: post.categories });
  } catch (error) {
    console.error("Error fetching post categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/posts/[postId]/categories - Add categories to post
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { postId } = await params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Check if user has access
    const role = await getUserRole(session.user.id, post.blogId);
    if (!role) {
      return NextResponse.json(
        { error: "You don't have access to this post" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = assignCategoriesSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    // Verify all categories belong to the same blog
    const categories = await prisma.category.findMany({
      where: {
        id: { in: validated.data.categoryIds },
        blogId: post.blogId,
      },
    });

    if (categories.length !== validated.data.categoryIds.length) {
      return NextResponse.json(
        { error: "One or more categories not found or don't belong to this blog" },
        { status: 400 }
      );
    }

    // Update post with categories
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        categories: {
          set: validated.data.categoryIds.map((id) => ({ id })),
        },
      },
      include: {
        categories: true,
        tags: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Categories updated successfully",
      categories: updatedPost.categories,
    });
  } catch (error) {
    console.error("Error updating post categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}