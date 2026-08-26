import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const memberships = await prisma.blogMember.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        blog: true,
      },
      orderBy: {
        blog: {
          name: "asc",
        },
      },
    });

    const blogs = memberships.map((membership) => ({
      ...membership.blog,
      role: membership.role,
    }));

    return NextResponse.json({ blogs });
  } catch (error) {
    console.error("Error fetching my blogs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}