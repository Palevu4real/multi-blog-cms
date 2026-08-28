import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateBlogSchema } from "@/lib/validations/blog";
import { hasPermission, getBlogWithAccess } from "@/lib/permissions";
import { isSlugAvailable } from "@/lib/utils/blog-utils";

// GET /api/blogs/[blogId] - Get a specific blog
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ blogId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { blogId } = await params;

    // Get blog with access check and include members
    const blog = await prisma.blog.findUnique({
      where: { id: blogId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!blog) {
      return NextResponse.json(
        { error: "Blog not found" },
        { status: 404 }
      );
    }

    // Check if user has access
    const userMember = blog.members.find((m) => m.userId === session.user.id);
    if (!userMember) {
      return NextResponse.json(
        { error: "You don't have access to this blog" },
        { status: 403 }
      );
    }

    // Get additional stats
    const stats = await prisma.$transaction([
      prisma.post.count({ where: { blogId } }),
      prisma.blogMember.count({ where: { blogId } }),
      prisma.category.count({ where: { blogId } }),
    ]);

    // Return blog with members and stats
    return NextResponse.json({
      ...blog,
      role: userMember.role,
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
  { params }: { params: Promise<{ blogId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { blogId } = await params;

    // Check permission
    const hasAccess = await hasPermission(
      session.user.id,
      blogId,
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

    // Prepare update data - only include fields that are provided
    const updateData: any = {};
    
    if (validated.data.name !== undefined) {
      updateData.name = validated.data.name;
    }
    if (validated.data.description !== undefined) {
      updateData.description = validated.data.description;
    }
    if (validated.data.isPublic !== undefined) {
      updateData.isPublic = validated.data.isPublic;
    }
    if (validated.data.timezone !== undefined) {
      updateData.timezone = validated.data.timezone;
    }
    if (validated.data.logo !== undefined) {
      updateData.logo = validated.data.logo;
    }
    
    // Handle slug separately with availability check
    if (validated.data.slug) {
      const isAvailable = await isSlugAvailable(validated.data.slug, blogId);
      if (!isAvailable) {
        return NextResponse.json(
          { error: "Slug is already taken" },
          { status: 409 }
        );
      }
      updateData.slug = validated.data.slug;
    }

    const updatedBlog = await prisma.blog.update({
      where: { id: blogId },
      data: updateData,
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    // Get the user's role
    const userMember = updatedBlog.members.find((m) => m.userId === session.user.id);

    return NextResponse.json({
      success: true,
      message: "Blog updated successfully",
      blog: {
        ...updatedBlog,
        role: userMember?.role || null,
      },
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
  { params }: { params: Promise<{ blogId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { blogId } = await params;

    // Check permission - only OWNER can delete
    const hasAccess = await hasPermission(
      session.user.id,
      blogId,
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
      where: { id: blogId },
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