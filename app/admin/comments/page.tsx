"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/format";

interface Comment {
  id: string;
  content: string;
  status: string;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  post?: {
    id: string;
    title: string;
    slug: string;
  };
  blog?: {
    id: string;
    name: string;
  };
  replies?: Comment[];
  _count?: {
    replies: number;
  };
}

interface Blog {
  id: string;
  name: string;
  role: string;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  blog: {
    id: string;
    name: string;
  };
}

export default function CommentsPage() {
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("PENDING");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedComments, setSelectedComments] = useState<string[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    spam: 0,
    trashed: 0,
  });

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError("");
      
      try {
        // Load blogs
        const blogsResponse = await fetch("/api/blogs", { credentials: "include" });
        const blogsData = await blogsResponse.json();
        if (blogsResponse.ok) {
          setBlogs(blogsData.blogs || []);
          if (blogsData.blogs?.length > 0) {
            const blogId = blogsData.blogs[0].id;
            setSelectedBlogId(blogId);
            await loadAllComments(blogId);
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

  const loadAllComments = async (blogId: string) => {
    try {
      // Get all posts for the blog
      const postsResponse = await fetch(`/api/posts?blogId=${blogId}&limit=100`, {
        credentials: "include",
      });
      
      if (!postsResponse.ok) {
        throw new Error("Failed to fetch posts");
      }

      const postsData = await postsResponse.json();
      const allComments: Comment[] = [];
      const statsData = { pending: 0, approved: 0, spam: 0, trashed: 0 };

      // Create a map of posts for quick lookup
      const postsMap: Record<string, Post> = {};
      (postsData.posts || []).forEach((post: Post) => {
        postsMap[post.id] = post;
      });

      // Fetch comments for each post
      for (const post of postsData.posts || []) {
        try {
          const commentsResponse = await fetch(`/api/posts/${post.id}/comments`, {
            credentials: "include",
          });
          
          if (commentsResponse.ok) {
            const commentsData = await commentsResponse.json();
            const postComments = commentsData.comments || [];
            
            // Add post and blog info to each comment
            postComments.forEach((comment: Comment) => {
              // Attach post info
              comment.post = {
                id: post.id,
                title: post.title || "Untitled Post",
                slug: post.slug || "untitled",
              };
              comment.blog = {
                id: post.blog?.id || blogId,
                name: post.blog?.name || "Unknown Blog",
              };
              
              // Initialize _count if not present
              if (!comment._count) {
                comment._count = { replies: 0 };
              }
              
              // Update stats
              if (comment.status === "PENDING") statsData.pending++;
              else if (comment.status === "APPROVED") statsData.approved++;
              else if (comment.status === "SPAM") statsData.spam++;
              else if (comment.status === "TRASHED") statsData.trashed++;
            });
            
            allComments.push(...postComments);
          }
        } catch (err) {
          console.error(`Failed to fetch comments for post ${post.id}:`, err);
        }
      }

      // Filter by status
      const filteredComments = allComments.filter(
        (c) => c.status === selectedStatus
      );

      setComments(filteredComments);
      setStats(statsData);
    } catch (err) {
      setError("Failed to load comments");
      console.error(err);
    }
  };

  const handleBlogChange = async (blogId: string) => {
    setSelectedBlogId(blogId);
    setSelectedComments([]);
    setComments([]);
    await loadAllComments(blogId);
  };

  const handleStatusChange = async (status: string) => {
    setSelectedStatus(status);
    setSelectedComments([]);
    await loadAllComments(selectedBlogId);
  };

  const handleAction = async (commentId: string, action: string) => {
    try {
      let url = `/api/comments/${commentId}`;
      
      if (action === "approve") {
        url = `/api/comments/${commentId}/approve`;
      } else if (action === "reject") {
        url = `/api/comments/${commentId}/reject`;
      } else if (action === "spam") {
        url = `/api/comments/${commentId}/spam`;
      }

      const response = await fetch(url, { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} comment`);
      }

      setSuccess(`Comment ${action}ed successfully!`);
      await loadAllComments(selectedBlogId);
      setSelectedComments([]);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedComments.length === 0) {
      setError("Please select at least one comment");
      return;
    }

    if (!confirm(`Are you sure you want to ${action} ${selectedComments.length} comment(s)?`)) {
      return;
    }

    try {
      for (const commentId of selectedComments) {
        let url = `/api/comments/${commentId}`;
        
        if (action === "approve") {
          url = `/api/comments/${commentId}/approve`;
        } else if (action === "reject") {
          url = `/api/comments/${commentId}/reject`;
        } else if (action === "spam") {
          url = `/api/comments/${commentId}/spam`;
        }

        await fetch(url, { method: "POST" });
      }

      setSuccess(`${selectedComments.length} comment(s) ${action}ed successfully!`);
      await loadAllComments(selectedBlogId);
      setSelectedComments([]);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleSelectComment = (commentId: string) => {
    setSelectedComments((prev) =>
      prev.includes(commentId)
        ? prev.filter((id) => id !== commentId)
        : [...prev, commentId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedComments.length === comments.length) {
      setSelectedComments([]);
    } else {
      setSelectedComments(comments.map((c) => c.id));
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
      PENDING: "warning",
      APPROVED: "success",
      SPAM: "danger",
      TRASHED: "default",
    };
    return map[status] || "default";
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Comments</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-600">Approved</p>
          <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-sm text-red-600">Spam</p>
          <p className="text-2xl font-bold text-red-700">{stats.spam}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Trashed</p>
          <p className="text-2xl font-bold text-gray-700">{stats.trashed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <select
            value={selectedBlogId}
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

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleStatusChange("PENDING")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              selectedStatus === "PENDING"
                ? "bg-yellow-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Pending ({stats.pending})
          </button>
          <button
            onClick={() => handleStatusChange("APPROVED")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              selectedStatus === "APPROVED"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Approved ({stats.approved})
          </button>
          <button
            onClick={() => handleStatusChange("SPAM")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              selectedStatus === "SPAM"
                ? "bg-red-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Spam ({stats.spam})
          </button>
          <button
            onClick={() => handleStatusChange("TRASHED")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              selectedStatus === "TRASHED"
                ? "bg-gray-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Trashed ({stats.trashed})
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedComments.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md flex items-center justify-between">
          <span className="text-sm text-blue-700">
            {selectedComments.length} comment(s) selected
          </span>
          <div className="flex gap-2">
            {selectedStatus === "PENDING" && (
              <>
                <Button size="sm" variant="success" onClick={() => handleBulkAction("approve")}>
                  Approve All
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleBulkAction("reject")}>
                  Reject All
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={() => setSelectedComments([])}>
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-6 p-3 bg-green-50 text-green-700 rounded-md text-sm">{success}</div>
      )}

      {/* Comments List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1).toLowerCase()} Comments ({comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {comments.length === 0 ? (
            <p className="text-gray-500 text-sm">No {selectedStatus.toLowerCase()} comments found.</p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedComments.includes(comment.id)}
                      onChange={() => toggleSelectComment(comment.id)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium flex-shrink-0">
                      {comment.author?.name?.[0] || comment.author?.email?.[0] || "?"}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {comment.author?.name || comment.author?.email || "Unknown User"}
                        </span>
                        <span className="text-sm text-gray-500">•</span>
                        <span className="text-sm text-gray-500">{formatDate(comment.createdAt)}</span>
                        <Badge variant={getStatusBadge(comment.status)}>
                          {comment.status}
                        </Badge>
                      </div>
                      <p className="text-gray-700 mt-1">{comment.content}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>On: {comment.post?.title || "Unknown Post"}</span>
                        <span>•</span>
                        <span>Blog: {comment.blog?.name || "Unknown Blog"}</span>
                        {comment._count?.replies ? (
                          <>
                            <span>•</span>
                            <span>{comment._count.replies} replies</span>
                          </>
                        ) : null}
                      </div>
                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {comment.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleAction(comment.id, "approve")}
                            >
                              ✅ Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAction(comment.id, "reject")}
                            >
                              🗑️ Reject
                            </Button>
                          </>
                        )}
                        {comment.status !== "SPAM" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(comment.id, "spam")}
                          >
                            🚫 Mark as Spam
                          </Button>
                        )}
                      </div>
                    </div>
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