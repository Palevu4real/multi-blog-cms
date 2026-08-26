import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTagSchema } from "@/lib/validations/post";
import { getUserRole, hasPermission } from "@/lib/permissions";
import { generateSlug } from "@/lib/utils/blog-utils";

// GET /api/tags - Get tags (filter by blogId)
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

    if (!blogId) {
      return NextResponse.json(
        { error: "blogId is required" },
        { status: 400 }
      );
    }

    const role = await getUserRole(session.user.id, blogId);
    if (!role) {
      return NextResponse.json(
        { error: "You don't have access to this blog" },
        { status: 403 }
      );
    }

    const tags = await prisma.tag.findMany({
      where: { blogId },
      include: {
        _count: {
          select: { posts: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/tags - Create a tag
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
    const validated = createTagSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const { blogId, name, slug } = validated.data;

    const canManage = await hasPermission(session.user.id, blogId, "manage_categories");
    if (!canManage) {
      return NextResponse.json(
        { error: "You don't have permission to manage tags" },
        { status: 403 }
      );
    }

    const finalSlug = slug || generateSlug(name);

    const existing = await prisma.tag.findFirst({
      where: {
        blogId,
        slug: finalSlug,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Tag with this slug already exists" },
        { status: 409 }
      );
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        slug: finalSlug,
        blogId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Tag created successfully",
      tag,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating tag:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}