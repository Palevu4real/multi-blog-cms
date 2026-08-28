import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserRole } from "@/lib/permissions";
import { z } from "zod";

const assignTagsSchema = z.object({
  tagIds: z.array(z.string()),
});

// GET /api/posts/[postId]/tags - Get tags for a post
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
        tags: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ tags: post.tags });
  } catch (error) {
    console.error("Error fetching post tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/posts/[postId]/tags - Add tags to post
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
    const validated = assignTagsSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    // Verify all tags belong to the same blog
    const tags = await prisma.tag.findMany({
      where: {
        id: { in: validated.data.tagIds },
        blogId: post.blogId,
      },
    });

    if (tags.length !== validated.data.tagIds.length) {
      return NextResponse.json(
        { error: "One or more tags not found or don't belong to this blog" },
        { status: 400 }
      );
    }

    // Update post with tags
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        tags: {
          set: validated.data.tagIds.map((id) => ({ id })),
        },
      },
      include: {
        categories: true,
        tags: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Tags updated successfully",
      tags: updatedPost.tags,
    });
  } catch (error) {
    console.error("Error updating post tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}