import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPostSchema } from "@/lib/validations/post";
import { generatePostSlug, generateExcerpt } from "@/lib/utils/blog-utils";
import { getUserRole, hasPermission } from "@/lib/permissions";
import { PostStatus } from "@prisma/client";

// GET /api/posts - List posts with filters
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const blogId = searchParams.get("blogId");
    const status = searchParams.get("status");
    const categoryId = searchParams.get("categoryId");
    const tagId = searchParams.get("tagId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Validate blogId is required
    if (!blogId) {
      return NextResponse.json(
        { error: "blogId is required" },
        { status: 400 }
      );
    }

    // Check if user has access to this blog
    const role = await getUserRole(session.user.id, blogId);
    if (!role) {
      return NextResponse.json(
        { error: "You don't have access to this blog" },
        { status: 403 }
      );
    }

    // Build where clause
    const where: any = { blogId };
    
    // Only add status filter if it's provided and valid
    if (status && ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"].includes(status)) {
      where.status = status;
    }

    if (categoryId) {
      where.categories = { some: { id: categoryId } };
    }
    if (tagId) {
      where.tags = { some: { id: tagId } };
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get posts with pagination
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
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
          categories: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          tags: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/posts - Create a new post
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validated = createPostSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const { blogId, title, content, status, excerpt, featuredImage, categoryIds, tagIds, publishedAt } = validated.data;

    // Check if user has access to this blog
    const role = await getUserRole(session.user.id, blogId);
    if (!role) {
      return NextResponse.json(
        { error: "You don't have access to this blog" },
        { status: 403 }
      );
    }

    // Check if user can publish (only Editors+ can publish directly)
    let finalStatus = status;
    if (status === "PUBLISHED") {
      const canPublish = await hasPermission(session.user.id, blogId, "publish_posts");
      if (!canPublish) {
        finalStatus = "REVIEW"; // Author submits for review
      }
    }

    // Generate slug
    const slug = await generatePostSlug(title, blogId);

    // Generate excerpt if not provided
    const finalExcerpt = excerpt || generateExcerpt(content);

    // Create post
    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content: content || null,
        excerpt: finalExcerpt,
        status: finalStatus as PostStatus,
        featuredImage: featuredImage || null,
        publishedAt: finalStatus === "PUBLISHED" ? (publishedAt ? new Date(publishedAt) : new Date()) : null,
        blogId,
        authorId: session.user.id,
        categories: categoryIds?.length ? {
          connect: categoryIds.map((id: string) => ({ id })),
        } : undefined,
        tags: tagIds?.length ? {
          connect: tagIds.map((id: string) => ({ id })),
        } : undefined,
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
      message: "Post created successfully",
      post,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}