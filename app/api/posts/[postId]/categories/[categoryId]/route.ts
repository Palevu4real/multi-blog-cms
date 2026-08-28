import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserRole } from "@/lib/permissions";

// DELETE /api/posts/[postId]/categories/[categoryId] - Remove category from post
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string; categoryId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { postId, categoryId } = await params;

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

    // Remove category from post
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        categories: {
          disconnect: { id: categoryId },
        },
      },
      include: {
        categories: true,
        tags: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Category removed from post",
      categories: updatedPost.categories,
    });
  } catch (error) {
    console.error("Error removing category from post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}