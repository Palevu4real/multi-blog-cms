import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCommentSchema, commentQuerySchema } from "@/lib/validations/comment";
import { getUserRole, hasPermission } from "@/lib/permissions";
import { CommentStatus } from "@prisma/client";

// GET /api/posts/[postId]/comments - Get all comments for a post
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth();
    const { postId } = await params;

    // Get the post and check if it exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        blog: {
          select: {
            id: true,
            isPublic: true,
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

    // Check if user has access to this blog
    let canViewAllComments = false;
    let canViewPendingComments = false;

    if (session?.user?.id) {
      const role = await getUserRole(session.user.id, post.blogId);
      canViewAllComments = !!role;
      // Editors+ can see pending comments
      canViewPendingComments = role ? await hasPermission(session.user.id, post.blogId, "moderate_comments") : false;
    }

    // Parse query params
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    // Build where clause
    const where: any = { postId };

    // If user is not authenticated or not a member, only show approved comments
    if (!canViewAllComments) {
      where.status = "APPROVED";
    } else if (!canViewPendingComments) {
      // Members can see all comments except spam
      where.status = { not: "SPAM" };
    }

    // Get comments with pagination (top-level comments only)
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: {
          ...where,
          parentId: null, // Only top-level comments
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          replies: {
            where: {
              status: canViewAllComments ? undefined : "APPROVED",
            },
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
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: {
              replies: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.comment.count({ where: { ...where, parentId: null } }),
    ]);

    // Filter replies based on permissions
    const filteredComments = comments.map(comment => ({
      ...comment,
      replies: canViewAllComments ? comment.replies : comment.replies.filter(r => r.status === "APPROVED"),
    }));

    return NextResponse.json({
      comments: filteredComments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/posts/[postId]/comments - Add a comment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be signed in to comment" },
        { status: 401 }
      );
    }

    const { postId } = await params;

    // Get the post
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        blog: {
          select: {
            id: true,
            isPublic: true,
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

    // Check if user has permission to comment on this blog
    const role = await getUserRole(session.user.id, post.blogId);
    const canComment = role !== null; // Any member can comment

    if (!canComment) {
      // Check if the blog is public and post is published
      if (!post.blog.isPublic || post.status !== "PUBLISHED") {
        return NextResponse.json(
          { error: "You don't have permission to comment on this post" },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const validated = createCommentSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const { content, parentId } = validated.data;

    // If parentId is provided, check if parent comment exists and belongs to same post
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
      });

      if (!parentComment || parentComment.postId !== postId) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 404 }
        );
      }

      // Check if parent comment is approved
      if (parentComment.status !== "APPROVED") {
        return NextResponse.json(
          { error: "Cannot reply to a comment that is not approved" },
          { status: 400 }
        );
      }
    }

    // Determine comment status
    let status: CommentStatus = "PENDING";
    // If user is a member with moderate permission, auto-approve
    if (role && await hasPermission(session.user.id, post.blogId, "moderate_comments")) {
      status = "APPROVED";
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        content,
        status,
        postId,
        blogId: post.blogId,
        authorId: session.user.id,
        parentId: parentId || null,
      },
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
    });

    return NextResponse.json({
      success: true,
      message: status === "APPROVED" ? "Comment added successfully" : "Comment submitted for moderation",
      comment,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}