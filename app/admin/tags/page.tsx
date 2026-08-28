"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface Tag {
  id: string;
  name: string;
  slug: string;
  _count: {
    posts: number;
  };
}

interface Blog {
  id: string;
  name: string;
  role: string;
}

export default function TagsPage() {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
  });

  // Load tags function
  const loadTags = async (blogId: string) => {
    if (!blogId) return;
    
    try {
      const response = await fetch(`/api/tags?blogId=${blogId}`, { 
        credentials: "include" 
      });
      const data = await response.json();
      if (response.ok) {
        setTags(data.tags || []);
      } else {
        setError(data.error || "Failed to load tags");
      }
    } catch (err) {
      setError("Failed to load tags");
    }
  };

  // Load blogs only on initial mount
  useEffect(() => {
    const loadBlogs = async () => {
      setIsLoading(true);
      setError("");
      
      try {
        const response = await fetch("/api/blogs", { credentials: "include" });
        const data = await response.json();
        if (response.ok) {
          setBlogs(data.blogs || []);
          if (data.blogs && data.blogs.length > 0) {
            const blogId = data.blogs[0].id;
            setSelectedBlogId(blogId);
            // Load tags for the first blog
            await loadTags(blogId);
          }
        } else {
          setError(data.error || "Failed to load blogs");
        }
      } catch (err) {
        setError("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadBlogs();
  }, []);

  const handleBlogChange = async (blogId: string) => {
    setSelectedBlogId(blogId);
    setError("");
    setSuccess("");
    await loadTags(blogId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const url = isEditing ? `/api/tags/${editingId}` : "/api/tags";
      const method = isEditing ? "PATCH" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          blogId: selectedBlogId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save tag");
      }

      setSuccess(isEditing ? "Tag updated successfully!" : "Tag created successfully!");
      setFormData({ name: "", slug: "" });
      setIsEditing(false);
      setEditingId(null);
      await loadTags(selectedBlogId);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (tag: Tag) => {
    setIsEditing(true);
    setEditingId(tag.id);
    setFormData({
      name: tag.name,
      slug: tag.slug,
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete tag "${name}"? This will remove it from all posts.`)) return;

    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete tag");
      }

      setSuccess("Tag deleted successfully!");
      await loadTags(selectedBlogId);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ name: "", slug: "" });
    setError("");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tags</h1>

      {/* Blog Selector */}
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

      {/* Error/Success Messages */}
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

      {/* Create/Edit Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Tag" : "Create New Tag"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Tag Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., JavaScript"
            />
            <Input
              label="Slug"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              placeholder="e.g., javascript (auto-generated if left blank)"
            />
            <div className="flex space-x-3">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : isEditing ? "Update Tag" : "Create Tag"}
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tags List */}
      <Card>
        <CardHeader>
          <CardTitle>All Tags ({tags.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <p className="text-gray-500 text-sm">No tags yet. Create your first tag above.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div>
                    <span className="font-medium text-gray-900">{tag.name}</span>
                    <span className="text-xs text-gray-500 ml-2">({tag._count.posts} posts)</span>
                    <span className="text-xs text-gray-400 ml-2">slug: {tag.slug}</span>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(tag)}
                      className="text-xs"
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(tag.id, tag.name)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}