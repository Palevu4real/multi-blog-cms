import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export default async function BlogsPage() {
  const user = await requireAuth();

  const memberships = await prisma.blogMember.findMany({
    where: { userId: user.id },
    include: {
      blog: {
        include: {
          _count: {
            select: {
              posts: true,
              members: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Blogs</h1>
        <Link href="/admin/blogs/new">
          <Button>
            <span className="mr-2">+</span> Create Blog
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {memberships.map((membership) => {
          const blog = membership.blog;
          return (
            <Link href={`/admin/blogs/${blog.id}`} key={blog.id}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{blog.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {blog.slug}
                      </p>
                    </div>
                    <Badge variant="success">{membership.role}</Badge>
                  </div>
                  {blog.description && (
                    <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                      {blog.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 mt-4 pt-4 border-t border-gray-100">
                    <div className="text-sm">
                      <span className="text-gray-500">Posts</span>
                      <span className="block font-semibold text-gray-900">
                        {blog._count.posts}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Members</span>
                      <span className="block font-semibold text-gray-900">
                        {blog._count.members}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Status</span>
                      <span className="block font-semibold text-gray-900">
                        {blog.isPublic ? "Public" : "Private"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {memberships.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">You don't have any blogs yet.</p>
          <Link href="/admin/blogs/new">
            <Button>Create Your First Blog</Button>
          </Link>
        </div>
      )}
    </div>
  );
}