"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut({ redirect: false });
    router.push("/auth/signin");
    setIsLoading(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Admin Dashboard</h2>
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-600">
          {user.name || user.email}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          disabled={isLoading}
        >
          {isLoading ? "Signing out..." : "Sign Out"}
        </Button>
      </div>
    </header>
  );
}