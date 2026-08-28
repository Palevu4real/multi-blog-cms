"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TiptapEditor } from "@/components/editor/TiptapEditor";

interface Blog {
  id: string;
  name: string;
  role: string;
}

interface Category {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
}

export default function CreatePostPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [formData, setFormData] = useState({
    blogId: "",
    title: "",
    content: null as any,
    status: "DRAFT",
    excerpt: "",
    featuredImage: "",
    categoryIds: [] as string[],
    tagIds: [] as string[],
  });

  // Load user's blogs
  useEffect(() => {
    const loadBlogs = async () => {
      try {
        const response = await fetch("/api/blogs", { credentials: "include" });
        const data = await response.json();
        if (response.ok) {
          setBlogs(data.blogs || []);
          if (data.blogs && data.blogs.length > 0) {
            const blogId = data.blogs[0].id;
            setFormData((prev) => ({ ...prev, blogId }));
            loadCategoriesAndTags(blogId);
          }
        }
      } catch (err) {
        console.error("Failed to load blogs:", err);
      }
    };
    loadBlogs();
  }, []);

  const loadCategoriesAndTags = async (blogId: string) => {
    try {
      const [categoriesRes, tagsRes] = await Promise.all([
        fetch(`/api/categories?blogId=${blogId}`, { credentials: "include" }),
        fetch(`/api/tags?blogId=${blogId}`, { credentials: "include" }),
      ]);
      
      const categoriesData = await categoriesRes.json();
      const tagsData = await tagsRes.json();
      
      if (categoriesRes.ok) {
        setCategories(categoriesData.categories || []);
      }
      if (tagsRes.ok) {
        setTags(tagsData.tags || []);
      }
    } catch (err) {
      console.error("Failed to load categories/tags:", err);
    }
  };

  const handleBlogChange = (blogId: string) => {
    setFormData((prev) => ({ ...prev, blogId, categoryIds: [], tagIds: [] }));
    loadCategoriesAndTags(blogId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create post");
      }

      setSuccess("Post created successfully!");
      router.push("/admin/posts");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMultiSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, (option) => option.value);
    setFormData((prev) => ({ ...prev, categoryIds: selectedOptions }));
  };

  const handleTagMultiSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, (option) => option.value);
    setFormData((prev) => ({ ...prev, tagIds: selectedOptions }));
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Post</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>
        )}
        {success && (
          <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm">{success}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Post Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Blog Selector */}
            {blogs.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Blog
                </label>
                <select
                  name="blogId"
                  value={formData.blogId}
                  onChange={(e) => handleBlogChange(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {blogs.map((blog) => (
                    <option key={blog.id} value={blog.id}>
                      {blog.name} ({blog.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

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
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to auto-generate from content.
              </p>
            </div>

            {/* Categories */}
            {categories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categories
                </label>
                <select
                  multiple
                  value={formData.categoryIds}
                  onChange={handleMultiSelect}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Hold Ctrl/Cmd to select multiple categories
                </p>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <select
                  multiple
                  value={formData.tagIds}
                  onChange={handleTagMultiSelect}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                >
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Hold Ctrl/Cmd to select multiple tags
                </p>
              </div>
            )}

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
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="flex space-x-3">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Post"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/posts")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}