"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { name: "Dashboard", href: "/admin", icon: "📊" },
  { name: "Blogs", href: "/admin/blogs", icon: "📝" },
  { name: "Posts", href: "/admin/posts", icon: "📄" },
  { name: "Categories", href: "/admin/categories", icon: "📂" },
  { name: "Tags", href: "/admin/tags", icon: "🏷️" },
  { name: "Comments", href: "/admin/comments", icon: "💬" },
  { name: "Settings", href: "/admin/settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0 overflow-y-auto">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-800">Multi-Blog CMS</h1>
      </div>
      <nav className="px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}