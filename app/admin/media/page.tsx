"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import Image from "next/image";

interface Media {
  id: string;
  url: string;
  publicId: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  createdAt: string;
}

interface Blog {
  id: string;
  name: string;
  role: string;
}

export default function MediaPage() {
  const router = useRouter();
  const [media, setMedia] = useState<Media[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError("");
      
      try {
        const blogsResponse = await fetch("/api/blogs", { credentials: "include" });
        const blogsData = await blogsResponse.json();
        if (blogsResponse.ok) {
          setBlogs(blogsData.blogs || []);
          if (blogsData.blogs?.length > 0) {
            const blogId = blogsData.blogs[0].id;
            setSelectedBlogId(blogId);
            await loadMedia(blogId);
          }
        } else {
          setError(blogsData.error || "Failed to load blogs");
        }
      } catch (err) {
        setError("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  const loadMedia = async (blogId: string) => {
    try {
      const response = await fetch(`/api/media?blogId=${blogId}`, {
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok) {
        setMedia(data.media || []);
      } else {
        setError(data.error || "Failed to load media");
      }
    } catch (err) {
      setError("Failed to load media");
    }
  };

  const handleBlogChange = async (blogId: string) => {
    setSelectedBlogId(blogId);
    await loadMedia(blogId);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log("No file selected");
      return;
    }

    console.log("📁 File selected:", file.name, file.type, file.size);

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB");
      return;
    }

    setIsUploading(true);
    setError("");
    setSuccess("");

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default";
      
      console.log("☁️ Cloudinary config:", { cloudName, uploadPreset });

      if (!cloudName) {
        throw new Error("Cloudinary cloud name is not configured");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", `blog-${selectedBlogId}`);

      console.log("📤 Uploading to Cloudinary...");

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const uploadData = await uploadResponse.json();
      console.log("📥 Cloudinary response:", uploadData);

      if (!uploadResponse.ok) {
        throw new Error(uploadData.error?.message || "Failed to upload image");
      }

      console.log("💾 Saving to database...");
      
      const saveResponse = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogId: selectedBlogId,
          imageUrl: uploadData.secure_url,
          publicId: uploadData.public_id,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          width: uploadData.width,
          height: uploadData.height,
          alt: file.name.split(".")[0],
        }),
      });

      const saveData = await saveResponse.json();
      console.log("💾 Database response:", saveData);

      if (!saveResponse.ok) {
        throw new Error(saveData.error || "Failed to save image metadata");
      }

      setSuccess("Image uploaded successfully!");
      await loadMedia(selectedBlogId);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      console.error("❌ Upload error:", err);
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (mediaItem: Media) => {
    if (!confirm(`Delete "${mediaItem.filename}"?`)) return;

    try {
      const response = await fetch("/api/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId: mediaItem.publicId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete image");
      }

      setSuccess("Image deleted successfully!");
      await loadMedia(selectedBlogId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setSuccess("URL copied to clipboard!");
    setTimeout(() => setSuccess(""), 3000);
  };

  const insertIntoEditor = (url: string) => {
    if (window.parent) {
      window.parent.postMessage({ type: "INSERT_IMAGE", url }, "*");
    }
  };

  if (isLoading && blogs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (blogs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">You don't have any blogs yet.</p>
        <Button onClick={() => router.push("/admin/blogs/new")}>
          Create a Blog First
        </Button>
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <Button
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer"
          >
            {isUploading ? "Uploading..." : "📤 Upload Image"}
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <select
          value={selectedBlogId}
          onChange={(e) => handleBlogChange(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {blogs.map((blog) => (
            <option key={blog.id} value={blog.id}>
              {blog.name} ({blog.role})
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-6 p-3 bg-green-50 text-green-700 rounded-md text-sm">{success}</div>
      )}

      {media.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">No images uploaded yet.</p>
            <p className="text-sm text-gray-400">
              Click "Upload Image" to add your first image.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map((item) => (
            <Card 
              key={item.id} 
              className="overflow-hidden hover:shadow-md transition-shadow group"
            >
              <div className="relative aspect-square bg-gray-100">
                <Image
                  src={item.url}
                  alt={item.alt || item.filename}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white/90 hover:bg-white text-xs"
                    onClick={() => handleCopyUrl(item.url)}
                  >
                    📋 Copy URL
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs"
                    onClick={() => handleDelete(item)}
                  >
                    🗑️ Delete
                  </Button>
                </div>
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate">{item.filename}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <span>{formatFileSize(item.size)}</span>
                  {item.width && item.height && (
                    <>
                      <span>•</span>
                      <span>{item.width}×{item.height}</span>
                    </>
                  )}
                </div>
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs w-full"
                    onClick={() => insertIntoEditor(item.url)}
                  >
                    📝 Insert into Post
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}