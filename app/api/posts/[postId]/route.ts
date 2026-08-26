import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updatePostSchema } from "@/lib/validations/post";
import { getUserRole, hasPermission } from "@/lib/permissions";
import { generatePostSlug, generateExcerpt } from "@/lib/utils/blog-utils";

// GET /api/posts/[postId] - Get a specific post
export async function GET(
  req: NextRequest,
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
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        blog: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        categories: true,
        tags: true,
        comments: {
          where: { status: "APPROVED" },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    const role = await getUserRole(session.user.id, post.blogId);
    if (!role && post.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "You don't have access to this post" },
        { status: 403 }
      );
    }

    if (session.user.id !== post.authorId) {
      await prisma.post.update({
        where: { id: postId },
        data: { views: { increment: 1 } },
      });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Error fetching post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/posts/[postId] - Update a post
export async function PATCH(
  req: NextRequest,
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

    if (post.authorId !== session.user.id) {
      const canEditOthers = await hasPermission(session.user.id, post.blogId, "edit_others_posts");
      if (!canEditOthers) {
        return NextResponse.json(
          { error: "You don't have permission to edit this post" },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const validated = updatePostSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const { title, content, status, excerpt, featuredImage, publishedAt } = validated.data;

    const updateData: any = {};
    if (title) {
      updateData.title = title;
      updateData.slug = await generatePostSlug(title, post.blogId, postId);
    }
    if (content) {
      updateData.content = content;
      if (!excerpt) {
        updateData.excerpt = generateExcerpt(content);
      }
    }
    if (excerpt) updateData.excerpt = excerpt;
    if (status) updateData.status = status;
    if (featuredImage !== undefined) updateData.featuredImage = featuredImage;
    
    if (status === "PUBLISHED" && post.status !== "PUBLISHED") {
      updateData.publishedAt = publishedAt ? new Date(publishedAt) : new Date();
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        blog: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        categories: true,
        tags: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Error updating post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/posts/[postId] - Delete a post
export async function DELETE(
  req: NextRequest,
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

    const canDelete = await hasPermission(session.user.id, post.blogId, "edit_others_posts");
    if (!canDelete && post.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "You don't have permission to delete this post" },
        { status: 403 }
      );
    }

    await prisma.post.delete({
      where: { id: postId },
    });

    return NextResponse.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}