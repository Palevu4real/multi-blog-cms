"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count: {
    posts: number;
  };
}

interface Blog {
  id: string;
  name: string;
  role: string;
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
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
    description: "",
  });

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
            // Load categories for the first blog
            await loadCategories(blogId);
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

  // Load categories when selected blog changes
  const loadCategories = async (blogId: string) => {
    if (!blogId) return;
    
    try {
      const response = await fetch(`/api/categories?blogId=${blogId}`, { 
        credentials: "include" 
      });
      const data = await response.json();
      if (response.ok) {
        setCategories(data.categories || []);
      } else {
        setError(data.error || "Failed to load categories");
      }
    } catch (err) {
      setError("Failed to load categories");
    }
  };

  const handleBlogChange = async (blogId: string) => {
    setSelectedBlogId(blogId);
    setError("");
    setSuccess("");
    await loadCategories(blogId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const url = isEditing ? `/api/categories/${editingId}` : "/api/categories";
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
        throw new Error(data.error || "Failed to save category");
      }

      setSuccess(isEditing ? "Category updated successfully!" : "Category created successfully!");
      setFormData({ name: "", slug: "", description: "" });
      setIsEditing(false);
      setEditingId(null);
      await loadCategories(selectedBlogId);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setIsEditing(true);
    setEditingId(category.id);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? This will remove it from all posts.`)) return;

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete category");
      }

      setSuccess("Category deleted successfully!");
      await loadCategories(selectedBlogId);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ name: "", slug: "", description: "" });
    setError("");
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Categories</h1>

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
          <CardTitle>{isEditing ? "Edit Category" : "Create New Category"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Category Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., Technology"
            />
            <Input
              label="Slug"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              placeholder="e.g., technology (auto-generated if left blank)"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of this category"
              />
            </div>
            <div className="flex space-x-3">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : isEditing ? "Update Category" : "Create Category"}
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

      {/* Categories List */}
      <Card>
        <CardHeader>
          <CardTitle>All Categories ({categories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-gray-500 text-sm">No categories yet. Create your first category above.</p>
          ) : (
            <div className="divide-y">
              {categories.map((category) => (
                <div key={category.id} className="py-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{category.name}</h4>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span>Slug: {category.slug}</span>
                      <span>•</span>
                      <Badge variant="info">{category._count.posts} posts</Badge>
                      {category.description && (
                        <>
                          <span>•</span>
                          <span>{category.description}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(category)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(category.id, category.name)}
                    >
                      Delete
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