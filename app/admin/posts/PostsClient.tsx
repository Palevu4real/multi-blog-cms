"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate, getStatusColor, getStatusLabel, truncateText } from "@/lib/utils/format";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  views: number;
  blog: {
    name: string;
    slug: string;
  };
  author: {
    name: string | null;
    email: string;
  };
  _count: {
    comments: number;
  };
}

interface Blog {
  id: string;
  name: string;
  role: string;
}

export function PostsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  const currentStatus = searchParams.get("status") || "";
  const currentPage = parseInt(searchParams.get("page") || "1");
  const currentBlogId = searchParams.get("blogId") || "";
  const limit = 10;
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError("");
      
      try {
        // Load blogs first
        const blogsResponse = await fetch("/api/blogs", { credentials: "include" });
        const blogsData = await blogsResponse.json();
        if (blogsResponse.ok) {
          setBlogs(blogsData.blogs || []);
        }

        // Build query params
        const params = new URLSearchParams();
        const blogId = currentBlogId || (blogsData.blogs?.[0]?.id || "");
        if (blogId) params.set("blogId", blogId);
        if (currentStatus) params.set("status", currentStatus);
        params.set("page", currentPage.toString());
        params.set("limit", limit.toString());

        // Load posts
        const postsResponse = await fetch(`/api/posts?${params.toString()}`, { 
          credentials: "include" 
        });
        const postsData = await postsResponse.json();
        
        if (postsResponse.ok) {
          setPosts(postsData.posts || []);
          setTotal(postsData.pagination?.total || 0);
          setTotalPages(postsData.pagination?.totalPages || 0);
        } else {
          setError(postsData.error || "Failed to load posts");
        }
      } catch (err) {
        setError("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [currentStatus, currentPage, currentBlogId]);

  const handleFilterChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status) {
      params.set("status", status);
    } else {
      params.delete("status");
    }
    params.delete("page");
    router.push(`/admin/posts?${params.toString()}`);
  };

  const handleBlogChange = (blogId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("blogId", blogId);
    params.delete("page");
    params.delete("status");
    router.push(`/admin/posts?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/admin/posts?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading posts...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
        <Link href="/admin/posts/new">
          <Button>
            <span className="mr-2">+</span> New Post
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="text-sm font-medium text-gray-700">Filters:</span>
        <button
          onClick={() => handleFilterChange("")}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            !currentStatus ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        <button
          onClick={() => handleFilterChange("DRAFT")}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            currentStatus === "DRAFT" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Drafts
        </button>
        <button
          onClick={() => handleFilterChange("REVIEW")}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            currentStatus === "REVIEW" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Review
        </button>
        <button
          onClick={() => handleFilterChange("PUBLISHED")}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            currentStatus === "PUBLISHED" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Published
        </button>
        <button
          onClick={() => handleFilterChange("ARCHIVED")}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            currentStatus === "ARCHIVED" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Archived
        </button>
      </div>

      {/* Blog Selector */}
      {blogs.length > 1 && (
        <div className="mb-6">
          <select
            value={currentBlogId || blogs[0]?.id || ""}
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
      )}

      {/* Posts List */}
      <Card>
        <CardContent className="p-0">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No posts found.</p>
              <Link href="/admin/posts/new">
                <Button>Create Your First Post</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {posts.map((post) => (
                <div key={post.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/admin/posts/${post.id}`}
                        className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {post.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
                        <span>By {post.author.name || post.author.email}</span>
                        <span>•</span>
                        <span>{post.blog.name}</span>
                        <span>•</span>
                        <span>{formatDate(post.createdAt)}</span>
                        {post.publishedAt && (
                          <>
                            <span>•</span>
                            <span className="text-green-600">Published {formatDate(post.publishedAt)}</span>
                          </>
                        )}
                      </div>
                      {post.excerpt && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {truncateText(post.excerpt, 200)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col sm:items-end gap-2">
                      <Badge variant={getStatusColor(post.status)}>
                        {getStatusLabel(post.status)}
                      </Badge>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>👁️ {post.views}</span>
                        <span>💬 {post._count.comments}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                p === currentPage ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {p}
            </button>
          ))}
          {totalPages > 5 && (
            <>
              <span className="px-2">...</span>
              <button
                onClick={() => handlePageChange(totalPages)}
                className="px-3 py-1 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}