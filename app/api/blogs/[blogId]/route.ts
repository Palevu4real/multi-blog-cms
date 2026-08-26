import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateBlogSchema } from "@/lib/validations/blog";
import { hasPermission, getBlogWithAccess } from "@/lib/permissions";
import { isSlugAvailable } from "@/lib/utils/blog-utils";

// GET /api/blogs/[blogId] - Get a specific blog
export async function GET(
  req: NextRequest,
  { params }: { params: { blogId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const blog = await getBlogWithAccess(session.user.id, params.blogId);
    
    if (!blog) {
      return NextResponse.json(
        { error: "Blog not found or you don't have access" },
        { status: 404 }
      );
    }

    // Get additional stats
    const stats = await prisma.$transaction([
      prisma.post.count({ where: { blogId: params.blogId } }),
      prisma.blogMember.count({ where: { blogId: params.blogId } }),
      prisma.category.count({ where: { blogId: params.blogId } }),
    ]);

    return NextResponse.json({
      ...blog,
      stats: {
        posts: stats[0],
        members: stats[1],
        categories: stats[2],
      },
    });
  } catch (error) {
    console.error("Error fetching blog:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/blogs/[blogId] - Update blog settings
export async function PATCH(
  req: NextRequest,
  { params }: { params: { blogId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check permission
    const hasAccess = await hasPermission(
      session.user.id,
      params.blogId,
      "manage_settings"
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You don't have permission to update this blog" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = updateBlogSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    // If slug is being updated, check availability
    if (validated.data.slug) {
      const isAvailable = await isSlugAvailable(validated.data.slug, params.blogId);
      if (!isAvailable) {
        return NextResponse.json(
          { error: "Slug is already taken" },
          { status: 409 }
        );
      }
    }

    const blog = await prisma.blog.update({
      where: { id: params.blogId },
      data: validated.data,
    });

    return NextResponse.json({
      success: true,
      message: "Blog updated successfully",
      blog,
    });
  } catch (error) {
    console.error("Error updating blog:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/blogs/[blogId] - Delete a blog
export async function DELETE(
  req: NextRequest,
  { params }: { params: { blogId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check permission - only OWNER can delete
    const hasAccess = await hasPermission(
      session.user.id,
      params.blogId,
      "delete_blog"
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Only the blog owner can delete this blog" },
        { status: 403 }
      );
    }

    // Delete the blog (cascade will handle related records)
    await prisma.blog.delete({
      where: { id: params.blogId },
    });

    return NextResponse.json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting blog:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}