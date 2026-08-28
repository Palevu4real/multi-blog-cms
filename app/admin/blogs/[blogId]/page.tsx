"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MemberList } from "@/components/admin/MemberList";

interface Member {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface BlogData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isPublic: boolean;
  timezone: string;
  role: string;
  members?: Member[];
  stats?: {
    posts: number;
    members: number;
    categories: number;
  };
}

export default function EditBlogPage({ params }: { params: Promise<{ blogId: string }> }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [blog, setBlog] = useState<BlogData | null>(null);
  const [blogId, setBlogId] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    isPublic: true,
    timezone: "UTC",
  });

  // Unwrap params
  useEffect(() => {
    const unwrapParams = async () => {
      const { blogId: id } = await params;
      setBlogId(id);
    };
    unwrapParams();
  }, [params]);

  // Load blog data
  useEffect(() => {
    if (!blogId) return;

    const loadBlog = async () => {
      try {
        const response = await fetch(`/api/blogs/${blogId}`);
        const data = await response.json();
        if (response.ok) {
          setBlog(data);
          setFormData({
            name: data.name || "",
            slug: data.slug || "",
            description: data.description || "",
            isPublic: data.isPublic ?? true,
            timezone: data.timezone || "UTC",
          });
        } else {
          setError(data.error || "Failed to load blog");
        }
      } catch (err) {
        setError("Failed to load blog");
      }
    };
    loadBlog();
  }, [blogId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/blogs/${blogId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update blog");
      }

      setSuccess("Blog updated successfully!");
      setBlog(data.blog);
      
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this blog? This action cannot be undone!")) {
      return;
    }

    setIsDeleting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/blogs/${blogId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete blog");
      }

      router.push("/admin/blogs");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  if (!blog) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading blog...</p>
      </div>
    );
  }

  // Safe access to stats with defaults
  const stats = blog.stats || { posts: 0, members: 0, categories: 0 };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Blog</h1>
        <div className="flex items-center space-x-3">
          <Badge variant={blog.role === "OWNER" ? "success" : "info"}>
            {blog.role}
          </Badge>
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-3 bg-green-50 text-green-700 rounded-md text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Blog Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="Blog Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="My Awesome Blog"
                />

                <Input
                  label="Slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  required
                  placeholder="my-awesome-blog"
                  helper="URL-friendly version of the blog name"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="What is your blog about?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timezone
                  </label>
                  <select
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Paris (CET)</option>
                    <option value="Asia/Dubai">Dubai (GST)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                    <option value="Australia/Sydney">Sydney (AEDT)</option>
                  </select>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="isPublic"
                    id="isPublic"
                    checked={formData.isPublic}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                    Make blog public
                  </label>
                </div>

                <div className="flex space-x-3 pt-4 border-t border-gray-100">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/admin/blogs")}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle>Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Posts</span>
                <span className="font-medium">{stats.posts}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Members</span>
                <span className="font-medium">{stats.members}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Categories</span>
                <span className="font-medium">{stats.categories}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <Badge variant={blog.isPublic ? "success" : "default"}>
                  {blog.isPublic ? "Public" : "Private"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Members Section */}
          <MemberList 
            blogId={blogId} 
            members={blog.members || []} 
            currentUserRole={blog.role} 
          />

          {/* Danger Zone - Only for Owners */}
          {blog.role === "OWNER" && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                  Delete this blog and all associated data. This action cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full"
                >
                  {isDeleting ? "Deleting..." : "Delete Blog"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}