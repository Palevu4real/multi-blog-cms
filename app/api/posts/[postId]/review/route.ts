import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserRole } from "@/lib/permissions";

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

    const role = await getUserRole(session.user.id, post.blogId);
    if (!role) {
      return NextResponse.json(
        { error: "You don't have access to this post" },
        { status: 403 }
      );
    }

    if (post.authorId !== session.user.id && !role) {
      return NextResponse.json(
        { error: "Only the author can submit for review" },
        { status: 403 }
      );
    }

    if (post.status === "PUBLISHED") {
      return NextResponse.json(
        { error: "This post is already published" },
        { status: 400 }
      );
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        status: "REVIEW",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Post submitted for review successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Error submitting post for review:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}