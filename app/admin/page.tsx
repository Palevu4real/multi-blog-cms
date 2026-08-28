import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { StatsCard } from "@/components/admin/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate, getStatusColor, getStatusLabel } from "@/lib/utils/format";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await requireAuth();

  // Get user's blogs
  const userBlogs = await prisma.blogMember.findMany({
    where: { userId: user.id },
    include: { blog: true },
  });

  const blogIds = userBlogs.map((b) => b.blogId);

  // Get stats across all user's blogs
  const [totalPosts, totalComments, totalDrafts, recentPosts] = await Promise.all([
    prisma.post.count({
      where: { blogId: { in: blogIds } },
    }),
    prisma.comment.count({
      where: { blogId: { in: blogIds } },
    }),
    prisma.post.count({
      where: {
        blogId: { in: blogIds },
        status: "DRAFT",
      },
    }),
    prisma.post.findMany({
      where: { blogId: { in: blogIds } },
      include: {
        blog: true,
        author: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard title="Total Blogs" value={userBlogs.length} icon="📝" color="blue" />
        <StatsCard title="Total Posts" value={totalPosts} icon="📄" color="green" />
        <StatsCard title="Draft Posts" value={totalDrafts} icon="✏️" color="orange" />
        <StatsCard title="Comments" value={totalComments} icon="💬" color="purple" />
      </div>

      {/* Recent Posts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPosts.length === 0 ? (
            <p className="text-gray-500 text-sm">No posts yet. Create your first post!</p>
          ) : (
            <div className="space-y-4">
              {recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <Link
                      href={`/admin/posts/${post.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {post.title}
                    </Link>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <span>{post.blog.name}</span>
                      <span>•</span>
                      <span>By {post.author.name || post.author.email}</span>
                      <span>•</span>
                      <span>{formatDate(post.createdAt)}</span>
                    </div>
                  </div>
                  <Badge variant={getStatusColor(post.status)}>
                    {getStatusLabel(post.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}