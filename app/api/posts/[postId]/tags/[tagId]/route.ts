import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserRole } from "@/lib/permissions";

// DELETE /api/posts/[postId]/tags/[tagId] - Remove tag from post
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string; tagId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { postId, tagId } = await params;

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

    // Remove tag from post
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        tags: {
          disconnect: { id: tagId },
        },
      },
      include: {
        categories: true,
        tags: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Tag removed from post",
      tags: updatedPost.tags,
    });
  } catch (error) {
    console.error("Error removing tag from post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}