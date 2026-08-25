import { PrismaClient, Role, PostStatus, CommentStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.category.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.media.deleteMany();
  await prisma.blogMember.deleteMany();
  await prisma.blog.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Cleaned existing data");

  // Create users
  const password = await hash("password123", 12);
  
  const users = {
    owner: await prisma.user.create({
      data: {
        email: "owner@example.com",
        name: "Blog Owner",
        password,
        emailVerified: new Date(),
      },
    }),
    admin: await prisma.user.create({
      data: {
        email: "admin@example.com",
        name: "Blog Admin",
        password,
        emailVerified: new Date(),
      },
    }),
    editor: await prisma.user.create({
      data: {
        email: "editor@example.com",
        name: "Content Editor",
        password,
        emailVerified: new Date(),
      },
    }),
    author: await prisma.user.create({
      data: {
        email: "author@example.com",
        name: "Content Author",
        password,
        emailVerified: new Date(),
      },
    }),
    contributor: await prisma.user.create({
      data: {
        email: "contributor@example.com",
        name: "Guest Contributor",
        password,
        emailVerified: new Date(),
      },
    }),
  };

  console.log(`👤 Created ${Object.keys(users).length} users`);

  // Create blogs
  const blog1 = await prisma.blog.create({
    data: {
      name: "Tech Chronicles",
      slug: "tech-chronicles",
      description: "Exploring the latest in technology, programming, and innovation",
      isPublic: true,
      timezone: "America/New_York",
    },
  });

  const blog2 = await prisma.blog.create({
    data: {
      name: "Creative Writing Hub",
      slug: "creative-writing-hub",
      description: "A community for writers and storytellers",
      isPublic: true,
      timezone: "Europe/London",
    },
  });

  const blog3 = await prisma.blog.create({
    data: {
      name: "Internal Team Blog",
      slug: "internal-team",
      description: "Private blog for team updates",
      isPublic: false,
      timezone: "UTC",
    },
  });

  console.log(`📝 Created ${3} blogs`);

  // Add blog members with different roles
  await prisma.blogMember.createMany({
    data: [
      { userId: users.owner.id, blogId: blog1.id, role: Role.OWNER },
      { userId: users.admin.id, blogId: blog1.id, role: Role.ADMIN },
      { userId: users.editor.id, blogId: blog1.id, role: Role.EDITOR },
      { userId: users.author.id, blogId: blog1.id, role: Role.AUTHOR },
      { userId: users.contributor.id, blogId: blog1.id, role: Role.AUTHOR },
      { userId: users.owner.id, blogId: blog2.id, role: Role.OWNER },
      { userId: users.admin.id, blogId: blog2.id, role: Role.ADMIN },
      { userId: users.editor.id, blogId: blog2.id, role: Role.EDITOR },
      { userId: users.author.id, blogId: blog2.id, role: Role.AUTHOR },
      { userId: users.owner.id, blogId: blog3.id, role: Role.OWNER },
      { userId: users.admin.id, blogId: blog3.id, role: Role.ADMIN },
      { userId: users.editor.id, blogId: blog3.id, role: Role.EDITOR },
    ],
  });

  console.log(`👥 Assigned blog memberships`);

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: "Programming",
        slug: "programming",
        blogId: blog1.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Artificial Intelligence",
        slug: "ai",
        blogId: blog1.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Web Development",
        slug: "web-dev",
        blogId: blog1.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Fiction",
        slug: "fiction",
        blogId: blog2.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Poetry",
        slug: "poetry",
        blogId: blog2.id,
      },
    }),
  ]);

  console.log(`📂 Created ${categories.length} categories`);

  // Create tags
  const tags = await Promise.all([
    prisma.tag.create({
      data: {
        name: "JavaScript",
        slug: "javascript",
        blogId: blog1.id,
      },
    }),
    prisma.tag.create({
      data: {
        name: "React",
        slug: "react",
        blogId: blog1.id,
      },
    }),
    prisma.tag.create({
      data: {
        name: "Machine Learning",
        slug: "machine-learning",
        blogId: blog1.id,
      },
    }),
    prisma.tag.create({
      data: {
        name: "Creative Writing",
        slug: "creative-writing",
        blogId: blog2.id,
      },
    }),
  ]);

  console.log(`🏷️ Created ${tags.length} tags`);

  // Get the actual post data (we need to handle the many-to-many relations properly)
  // First, get the created posts so we can get their actual IDs
  const techPost = await prisma.post.create({
    data: {
      title: "Getting Started with Next.js 14",
      slug: "getting-started-nextjs-14",
      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Introduction to Next.js 14" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Next.js 14 brings exciting new features including Server Components, improved performance, and better developer experience. In this post, we'll explore what's new and how to leverage these features in your projects.",
              },
            ],
          },
        ],
      },
      status: PostStatus.PUBLISHED,
      publishedAt: new Date("2024-01-15"),
      blogId: blog1.id,
      authorId: users.editor.id,
      views: 1247,
      categories: {
        connect: [
          { id: categories[0].id },
          { id: categories[2].id },
        ],
      },
      tags: {
        connect: [
          { id: tags[0].id },
          { id: tags[1].id },
        ],
      },
    },
  });

  const aiPost = await prisma.post.create({
    data: {
      title: "Understanding AI and Machine Learning",
      slug: "understanding-ai-ml",
      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Demystifying Artificial Intelligence" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Artificial Intelligence and Machine Learning are transforming industries. In this comprehensive guide, we break down complex concepts into digestible insights.",
              },
            ],
          },
        ],
      },
      status: PostStatus.PUBLISHED,
      publishedAt: new Date("2024-02-20"),
      blogId: blog1.id,
      authorId: users.author.id,
      views: 856,
      categories: {
        connect: [{ id: categories[1].id }],
      },
      tags: {
        connect: [{ id: tags[2].id }],
      },
    },
  });

  await prisma.post.create({
    data: {
      title: "Mastering React Hooks",
      slug: "mastering-react-hooks",
      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "React Hooks Deep Dive" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "React Hooks revolutionized how we write React components. Let's explore useState, useEffect, and custom hooks in depth.",
              },
            ],
          },
        ],
      },
      status: PostStatus.REVIEW,
      blogId: blog1.id,
      authorId: users.contributor.id,
      views: 45,
      categories: {
        connect: [{ id: categories[2].id }],
      },
      tags: {
        connect: [{ id: tags[1].id }],
      },
    },
  });

  const storyPost = await prisma.post.create({
    data: {
      title: "The Art of Storytelling",
      slug: "art-of-storytelling",
      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Mastering the Craft" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Great stories captivate readers and transport them to new worlds. Whether you're writing fiction or non-fiction, mastering the art of storytelling is essential.",
              },
            ],
          },
        ],
      },
      status: PostStatus.PUBLISHED,
      publishedAt: new Date("2024-03-01"),
      blogId: blog2.id,
      authorId: users.editor.id,
      views: 2341,
      categories: {
        connect: [{ id: categories[3].id }],
      },
      tags: {
        connect: [{ id: tags[3].id }],
      },
    },
  });

  await prisma.post.create({
    data: {
      title: "Writing Poetry for Beginners",
      slug: "writing-poetry-beginners",
      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Finding Your Voice" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Poetry is a powerful form of expression. This guide helps beginners find their voice and craft meaningful poems.",
              },
            ],
          },
        ],
      },
      status: PostStatus.DRAFT,
      blogId: blog2.id,
      authorId: users.author.id,
      views: 0,
      categories: {
        connect: [{ id: categories[4].id }],
      },
      tags: {
        connect: [{ id: tags[3].id }],
      },
    },
  });

  console.log(`📄 Created posts`);

  // Create comments
  await prisma.comment.createMany({
    data: [
      {
        content: "Great article! Really helpful for getting started with Next.js.",
        status: CommentStatus.APPROVED,
        postId: techPost.id,
        blogId: blog1.id,
        authorId: users.admin.id,
      },
      {
        content: "I've been using Next.js for a year now, and this covers everything perfectly.",
        status: CommentStatus.APPROVED,
        postId: techPost.id,
        blogId: blog1.id,
        authorId: users.author.id,
      },
      {
        content: "Love the storytelling tips! Can't wait to apply these to my writing.",
        status: CommentStatus.PENDING,
        postId: storyPost.id,
        blogId: blog2.id,
        authorId: users.author.id,
      },
    ],
  });

  console.log(`💬 Created comments`);
  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });