import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateMemberRoleSchema } from "@/lib/validations/blog";
import { hasPermission, getUserRole } from "@/lib/permissions";
import { Role } from "@prisma/client";

// PATCH /api/blogs/[blogId]/members/[userId] - Update member role
export async function PATCH(
  req: NextRequest,
  { params }: { params: { blogId: string; userId: string } }
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
      "manage_members"
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You don't have permission to manage members" },
        { status: 403 }
      );
    }

    // Can't modify yourself
    if (session.user.id === params.userId) {
      return NextResponse.json(
        { error: "You cannot modify your own role" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = updateMemberRoleSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    // Check if member exists
    const member = await prisma.blogMember.findUnique({
      where: {
        userId_blogId: {
          userId: params.userId,
          blogId: params.blogId,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Prevent changing OWNER role
    if (member.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot change the role of the blog owner" },
        { status: 403 }
      );
    }

    // Update role
    const updatedMember = await prisma.blogMember.update({
      where: {
        userId_blogId: {
          userId: params.userId,
          blogId: params.blogId,
        },
      },
      data: {
        role: validated.data.role as Role,
      },
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
    });

    return NextResponse.json({
      success: true,
      message: "Member role updated successfully",
      member: updatedMember,
    });
  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/blogs/[blogId]/members/[userId] - Remove a member
export async function DELETE(
  req: NextRequest,
  { params }: { params: { blogId: string; userId: string } }
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
      "manage_members"
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You don't have permission to manage members" },
        { status: 403 }
      );
    }

    // Can't remove yourself
    if (session.user.id === params.userId) {
      return NextResponse.json(
        { error: "You cannot remove yourself from the blog" },
        { status: 403 }
      );
    }

    // Check if member exists
    const member = await prisma.blogMember.findUnique({
      where: {
        userId_blogId: {
          userId: params.userId,
          blogId: params.blogId,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Prevent removing OWNER
    if (member.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot remove the blog owner" },
        { status: 403 }
      );
    }

    // Remove member
    await prisma.blogMember.delete({
      where: {
        userId_blogId: {
          userId: params.userId,
          blogId: params.blogId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}