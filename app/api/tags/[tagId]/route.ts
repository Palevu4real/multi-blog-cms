import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateTagSchema } from "@/lib/validations/post";
import { hasPermission, getUserRole } from "@/lib/permissions";
import { generateSlug } from "@/lib/utils/blog-utils";

// GET /api/tags/[tagId] - Get a specific tag
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { tagId } = await params;

    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    if (!tag) {
      return NextResponse.json(
        { error: "Tag not found" },
        { status: 404 }
      );
    }

    // Check if user has access to this tag's blog
    const role = await getUserRole(session.user.id, tag.blogId);
    if (!role) {
      return NextResponse.json(
        { error: "You don't have access to this tag" },
        { status: 403 }
      );
    }

    return NextResponse.json({ tag });
  } catch (error) {
    console.error("Error fetching tag:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/tags/[tagId] - Update a tag
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { tagId } = await params;

    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!tag) {
      return NextResponse.json(
        { error: "Tag not found" },
        { status: 404 }
      );
    }

    // Check permission
    const canManage = await hasPermission(session.user.id, tag.blogId, "manage_categories");
    if (!canManage) {
      return NextResponse.json(
        { error: "You don't have permission to manage tags" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = updateTagSchema.safeParse(body);

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
    if (validated.data.slug) {
      // Check if slug is unique
      const existing = await prisma.tag.findFirst({
        where: {
          blogId: tag.blogId,
          slug: validated.data.slug,
          NOT: { id: tagId },
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Tag with this slug already exists" },
          { status: 409 }
        );
      }
      updateData.slug = validated.data.slug;
    }

    const updatedTag = await prisma.tag.update({
      where: { id: tagId },
      data: updateData,
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Tag updated successfully",
      tag: updatedTag,
    });
  } catch (error) {
    console.error("Error updating tag:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/tags/[tagId] - Delete a tag
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { tagId } = await params;

    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!tag) {
      return NextResponse.json(
        { error: "Tag not found" },
        { status: 404 }
      );
    }

    // Check permission
    const canManage = await hasPermission(session.user.id, tag.blogId, "manage_categories");
    if (!canManage) {
      return NextResponse.json(
        { error: "You don't have permission to delete tags" },
        { status: 403 }
      );
    }

    // Delete tag
    await prisma.tag.delete({
      where: { id: tagId },
    });

    return NextResponse.json({
      success: true,
      message: "Tag deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}