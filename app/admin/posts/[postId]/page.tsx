"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { formatDate } from "@/lib/utils/format";

interface PostData {
  id: string;
  title: string;
  slug: string;
  content: any;
  excerpt: string | null;
  status: string;
  featuredImage: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  views: number;
  blog: {
    id: string;
    name: string;
  };
  author: {
    name: string | null;
    email: string;
  };
}

export default function EditPostPage({ params }: { params: Promise<{ postId: string }> }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [post, setPost] = useState<PostData | null>(null);
  const [postId, setPostId] = useState<string>("");
  const [formData, setFormData] = useState({
    title: "",
    content: null as any,
    status: "",
    excerpt: "",
    featuredImage: "",
  });

  // Unwrap params
  useEffect(() => {
    const unwrapParams = async () => {
      const { postId: id } = await params;
      setPostId(id);
    };
    unwrapParams();
  }, [params]);

  // Load post data
  useEffect(() => {
    if (!postId) return;

    const loadPost = async () => {
      try {
        const response = await fetch(`/api/posts/${postId}`, { credentials: "include" });
        const data = await response.json();
        if (response.ok) {
          setPost(data.post);
          setFormData({
            title: data.post.title || "",
            content: data.post.content || null,
            status: data.post.status || "DRAFT",
            excerpt: data.post.excerpt || "",
            featuredImage: data.post.featuredImage || "",
          });
        } else {
          setError(data.error || "Failed to load post");
        }
      } catch (err) {
        setError("Failed to load post");
      }
    };
    loadPost();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update post");
      }

      setSuccess("Post updated successfully!");
      setPost(data.post);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/posts/${postId}/publish`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to publish post");
      }

      setSuccess("Post published successfully!");
      setPost(data.post);
      setFormData((prev) => ({ ...prev, status: "PUBLISHED" }));
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    setIsDeleting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete post");
      }

      router.push("/admin/posts");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (!post) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading post...</p>
      </div>
    );
  }

  const canPublish = post.status !== "PUBLISHED";

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Post</h1>
        <div className="flex items-center space-x-3">
          <Badge variant={post.status === "PUBLISHED" ? "success" : post.status === "REVIEW" ? "warning" : "default"}>
            {post.status}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-6 p-3 bg-green-50 text-green-700 rounded-md text-sm">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Post Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Enter post title..."
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <TiptapEditor
                content={formData.content}
                onChange={(content) => setFormData((prev) => ({ ...prev, content }))}
                placeholder="Write your post content here..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Excerpt
              </label>
              <textarea
                name="excerpt"
                value={formData.excerpt}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="A short summary of your post..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Featured Image URL
              </label>
              <Input
                name="featuredImage"
                value={formData.featuredImage}
                onChange={handleChange}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="DRAFT">Draft</option>
                <option value="REVIEW">Review</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
          {canPublish && (
            <Button type="button" variant="success" onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? "Publishing..." : "📢 Publish"}
            </Button>
          )}
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/posts")}>
            Cancel
          </Button>
        </div>
      </form>

      {/* Post Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Post Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Slug</span>
            <span className="font-medium">{post.slug}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Author</span>
            <span className="font-medium">{post.author.name || post.author.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Blog</span>
            <span className="font-medium">{post.blog.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Created</span>
            <span className="font-medium">{formatDate(post.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Views</span>
            <span className="font-medium">{post.views}</span>
          </div>
          {post.publishedAt && (
            <div className="flex justify-between">
              <span className="text-gray-500">Published</span>
              <span className="font-medium">{formatDate(post.publishedAt)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}