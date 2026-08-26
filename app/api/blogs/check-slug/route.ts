import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkSlugSchema } from "@/lib/validations/blog";

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
    const slug = searchParams.get("slug");
    const blogId = searchParams.get("blogId") || undefined;

    const validated = checkSlugSchema.safeParse({ slug, blogId });
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const existing = await prisma.blog.findFirst({
      where: {
        slug: validated.data.slug,
        NOT: blogId ? { id: blogId } : undefined,
      },
    });

    return NextResponse.json({
      available: !existing,
      slug: validated.data.slug,
    });
  } catch (error) {
    console.error("Error checking slug:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}