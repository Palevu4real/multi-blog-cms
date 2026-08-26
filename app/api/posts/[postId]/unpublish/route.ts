import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }  // ← Make params a Promise
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { postId } = await params;  // ← Await params

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    const canPublish = await hasPermission(session.user.id, post.blogId, "publish_posts");
    if (!canPublish) {
      return NextResponse.json(
        { error: "You don't have permission to unpublish posts" },
        { status: 403 }
      );
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        status: "DRAFT",
        publishedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Post unpublished successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Error unpublishing post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}