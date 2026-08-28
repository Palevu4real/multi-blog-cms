import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateCategorySchema } from "@/lib/validations/post";
import { hasPermission, getUserRole } from "@/lib/permissions";
import { generateSlug } from "@/lib/utils/blog-utils";

// GET /api/categories/[categoryId] - Get a specific category
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { categoryId } = await params;

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Check if user has access to this category's blog
    const role = await getUserRole(session.user.id, category.blogId);
    if (!role) {
      return NextResponse.json(
        { error: "You don't have access to this category" },
        { status: 403 }
      );
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/categories/[categoryId] - Update a category
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { categoryId } = await params;

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Check permission
    const canManage = await hasPermission(session.user.id, category.blogId, "manage_categories");
    if (!canManage) {
      return NextResponse.json(
        { error: "You don't have permission to manage categories" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = updateCategorySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (validated.data.name !== undefined) {
      updateData.name = validated.data.name;
    }
    if (validated.data.description !== undefined) {
      updateData.description = validated.data.description;
    }
    if (validated.data.slug) {
      // Check if slug is unique
      const existing = await prisma.category.findFirst({
        where: {
          blogId: category.blogId,
          slug: validated.data.slug,
          NOT: { id: categoryId },
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Category with this slug already exists" },
          { status: 409 }
        );
      }
      updateData.slug = validated.data.slug;
    }

    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: updateData,
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[categoryId] - Delete a category
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { categoryId } = await params;

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Check permission
    const canManage = await hasPermission(session.user.id, category.blogId, "manage_categories");
    if (!canManage) {
      return NextResponse.json(
        { error: "You don't have permission to delete categories" },
        { status: 403 }
      );
    }

    // Delete category
    await prisma.category.delete({
      where: { id: categoryId },
    });

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}