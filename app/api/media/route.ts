import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";

// GET /api/media - Get all media for a blog
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

    const media = await prisma.media.findMany({
      where: { blogId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ media });
  } catch (error) {
    console.error("Error fetching media:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/media - Upload a new image
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
    const { blogId, imageUrl, publicId, filename, mimeType, size, width, height, alt } = body;

    if (!blogId || !imageUrl || !publicId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const media = await prisma.media.create({
      data: {
        url: imageUrl,
        publicId,
        filename: filename || "Untitled",
        mimeType: mimeType || "image/jpeg",
        size: size || 0,
        width: width || null,
        height: height || null,
        alt: alt || null,
        blogId,
        uploadedById: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Image uploaded successfully",
      media,
    });
  } catch (error) {
    console.error("Error uploading media:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/media - Delete an image
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { publicId } = body;

    if (!publicId) {
      return NextResponse.json(
        { error: "publicId is required" },
        { status: 400 }
      );
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(publicId);

    // Delete from database
    await prisma.media.deleteMany({
      where: { publicId },
    });

    return NextResponse.json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting media:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}