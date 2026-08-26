import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBlogSchema } from "@/lib/validations/blog";
import { generateSlug, isSlugAvailable } from "@/lib/utils/blog-utils";

const MAX_BLOGS_PER_USER = parseInt(process.env.MAX_BLOGS_PER_USER || "3");

// GET /api/blogs - Get all blogs for the current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const blogs = await prisma.blogMember.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        blog: {
          include: {
            _count: {
              select: {
                posts: true,
                members: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedBlogs = blogs.map((member) => ({
      ...member.blog,
      role: member.role,
      postCount: member.blog._count.posts,
      memberCount: member.blog._count.members,
    }));

    return NextResponse.json({ blogs: formattedBlogs });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/blogs - Create a new blog
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
    const validated = createBlogSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, slug, description, isPublic, timezone } = validated.data;

    // Check if user has reached max blogs
    const userBlogs = await prisma.blogMember.count({
      where: {
        userId: session.user.id,
        role: "OWNER",
      },
    });

    if (userBlogs >= MAX_BLOGS_PER_USER) {
      return NextResponse.json(
        { error: `You have reached the maximum of ${MAX_BLOGS_PER_USER} blogs` },
        { status: 403 }
      );
    }

    // Generate slug if not provided
    let finalSlug = slug || generateSlug(name);
    
    // Check if slug is available
    const isAvailable = await isSlugAvailable(finalSlug);
    if (!isAvailable) {
      // Append a random number to make it unique
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    // Create blog and add owner
    const blog = await prisma.blog.create({
      data: {
        name,
        slug: finalSlug,
        description: description || null,
        isPublic: isPublic ?? true,
        timezone: timezone || "UTC",
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Blog created successfully",
        blog,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating blog:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}