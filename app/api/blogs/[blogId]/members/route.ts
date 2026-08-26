import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inviteMemberSchema } from "@/lib/validations/blog";
import { hasPermission } from "@/lib/permissions";
import { Role } from "@prisma/client";

// GET /api/blogs/[blogId]/members - List all members
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

    // Check if user is a member
    const isMember = await prisma.blogMember.findUnique({
      where: {
        userId_blogId: {
          userId: session.user.id,
          blogId: params.blogId,
        },
      },
    });

    if (!isMember) {
      return NextResponse.json(
        { error: "You don't have access to this blog" },
        { status: 403 }
      );
    }

    const members = await prisma.blogMember.findMany({
      where: {
        blogId: params.blogId,
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
      orderBy: [
        { role: "asc" },
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/blogs/[blogId]/members - Invite a member
export async function POST(
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

    // Check permission - only OWNER and ADMIN can invite
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

    const body = await req.json();
    const validated = inviteMemberSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, role } = validated.data;

    // Check if user exists
    const userToInvite = await prisma.user.findUnique({
      where: { email },
    });

    if (!userToInvite) {
      return NextResponse.json(
        { error: "User not found. They need to sign up first." },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMember = await prisma.blogMember.findUnique({
      where: {
        userId_blogId: {
          userId: userToInvite.id,
          blogId: params.blogId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member of this blog" },
        { status: 409 }
      );
    }

    // Add member
    const member = await prisma.blogMember.create({
      data: {
        userId: userToInvite.id,
        blogId: params.blogId,
        role: role as Role,
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
      message: "Member invited successfully",
      member,
    }, { status: 201 });
  } catch (error) {
    console.error("Error inviting member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}